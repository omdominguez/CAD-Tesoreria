/* ============================================================
   IMPORTAR ODOO — DESDE UN ARCHIVO EXPORTADO A MANO
   ------------------------------------------------------------
   Mientras no haya acceso a la API, esto permite probar todo el
   flujo igual: exportas la lista de "Pedidos de compra" o
   "Facturas de cliente" desde Odoo (CSV o Excel) y se procesa
   con la misma lógica de emparejamiento y anti-duplicados que
   usará la sincronización automática cuando esté lista.

   Incluye además la conversión Bs -> USD con la tasa BCV de la
   fecha del pedido, PERO decidida a mano por el usuario (revisión
   fila por fila), no automáticamente según la columna de Odoo —
   así se evitan errores del equipo al capturar en la moneda
   equivocada.
   ============================================================ */

function normalizarFecha(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor)) return valor.toISOString().slice(0, 10);
  const s = String(valor).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(s);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = "20" + y;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function normalizarMonto(valor) {
  if (valor === "" || valor == null) return null;
  if (typeof valor === "number") return valor;
  let s = String(valor).trim().replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Lee cualquier CSV/XLSX/XLS a una grilla cruda (fila 0 = encabezados). Reutilizable para cualquier export tabular. */
export async function leerArchivoTabular(file) {
  const XLSX = await import("xlsx");
  const esCSV = /\.csv$/i.test(file.name || "");

  let libro;
  if (esCSV) {
    // Los CSV que exporta Odoo son UTF-8 sin marca BOM. Si se le pasa el
    // archivo "en crudo" (ArrayBuffer) a la librería, su detector de
    // codificación para CSV asume Latin1/CP1252 por defecto y los acentos
    // se corrompen ("Identificación" -> "IdentificaciÃ³n") — eso rompe la
    // detección automática de columnas como RIF o Moneda, que buscan esas
    // palabras con tilde. Decodificando el archivo como UTF-8 nosotros
    // mismos antes de pasarlo, se evita el problema por completo.
    const texto = await file.text(); // File.text() siempre decodifica como UTF-8
    libro = XLSX.read(texto, { type: "string", cellDates: true });
  } else {
    const buffer = await file.arrayBuffer();
    libro = XLSX.read(buffer, { type: "array", cellDates: true });
  }

  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: "" });
  return filas.filter((f) => f.some((c) => String(c).trim() !== ""));
}

/**
 * A partir de la grilla + el mapeo de columnas elegido, devuelve las filas
 * limpias: [{ numero, contacto, rif, monto, fecha, monedaOriginal }]. Ignora
 * silenciosamente cualquier fila sin número o monto válidos.
 */
export function normalizarFilasOdoo(filas, mapeo) {
  const { colNumero, colContacto, colRif, colMonto, colFecha, colMoneda, colProducto } = mapeo;
  const out = [];
  filas.forEach((fila) => {
    const numero = colNumero != null ? String(fila[colNumero] ?? "").trim() : "";
    const monto = colMonto != null ? normalizarMonto(fila[colMonto]) : null;
    if (!numero || monto === null) return;
    out.push({
      numero,
      contacto: colContacto != null ? String(fila[colContacto] ?? "").trim() : "",
      rif: colRif != null ? String(fila[colRif] ?? "").trim() : "",
      monto,
      fecha: colFecha != null ? normalizarFecha(fila[colFecha]) : null,
      monedaOriginal: colMoneda != null ? String(fila[colMoneda] ?? "").trim() : "$",
      producto: colProducto != null ? String(fila[colProducto] ?? "").trim() : ""
    });
  });
  return out;
}

/**
 * Busca la tasa BCV vigente en una fecha, recorriendo el historial hacia
 * atrás desde ese día (igual que el resto del sistema). Se usa SOLO como
 * sugerencia inicial en el paso de revisión — la tasa que realmente se
 * aplica siempre es la que el usuario escribe a mano (ver
 * convertirConTasaManual), porque la tasa real de una transferencia puede
 * diferir de la BCV publicada (paralela, negociada, etc.).
 */
export function sugerirTasaHistorica(st, fecha) {
  const hist = st?.historialTasas || {};
  if (fecha) {
    const fechas = Object.keys(hist).filter((f) => f <= fecha).sort();
    for (let i = fechas.length - 1; i >= 0; i--) {
      const v = Number(hist[fechas[i]]?.tasaBCV) || 0;
      if (v > 0) return v;
    }
  }
  return Number(st?.config?.tasaBCV) || 0;
}

/**
 * Convierte cada fila a su equivalente en USD usando la TASA QUE EL
 * USUARIO ESCRIBIÓ A MANO para esa fila (f.tasaManual) — no una calculada
 * automáticamente. El historial de tasas solo sirve para sugerir un punto
 * de partida al entrar a la revisión (ver sugerirTasaHistorica); lo que de
 * verdad se usa para la conversión es siempre el número que el usuario
 * confirmó, porque puede conocer la tasa real que se pagó en la
 * transferencia (que no siempre es igual a la BCV publicada ese día).
 *
 * Si una fila está marcada en Bs y no tiene una tasa válida escrita, NO se
 * adivina: queda "sinTasa" para que el usuario la complete antes de poder
 * importar esa fila.
 */
export function convertirConTasaManual(filas) {
  return filas.map((f) => {
    if (f.monedaElegida !== "BS") return { ...f, montoUSD: f.monto, tasaUsada: null, sinTasa: false };

    const tasa = Number(f.tasaManual) || 0;
    if (!tasa || tasa <= 0) return { ...f, montoUSD: null, tasaUsada: null, sinTasa: true };

    return { ...f, montoUSD: f.monto / tasa, tasaUsada: tasa, sinTasa: false };
  });
}
