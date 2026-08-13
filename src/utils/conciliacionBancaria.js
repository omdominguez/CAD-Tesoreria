/* ============================================================
   CONCILIACIÓN BANCARIA — IMPORTAR ESTADO DE CUENTA
   ------------------------------------------------------------
   Lee un archivo de estado de cuenta (CSV o Excel exportado del
   banco), deja que el usuario indique qué columna es cuál (los
   formatos varían mucho de un banco a otro), y empareja cada
   línea del banco contra los movimientos del sistema que aún no
   están conciliados — por monto exacto y fecha cercana.

   Esto NO reemplaza el criterio humano: los emparejamientos
   ambiguos o sin coincidencia se dejan para revisión manual, no
   se fuerzan.
   ============================================================ */

/** Lee el archivo (csv/xls/xlsx) y devuelve la grilla cruda: array de filas, cada fila un array de celdas. */
export async function leerArchivoEstadoCuenta(file) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array", cellDates: true });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false, defval: "" });
  // Quita filas completamente vacías (comunes al final de exportes de banco)
  return filas.filter((f) => f.some((c) => String(c).trim() !== ""));
}

/** Convierte un valor de celda de fecha (string en varios formatos, o Date ya parseado por SheetJS) a "YYYY-MM-DD". */
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

/** Convierte "1.234,56" / "1,234.56" / "-500" a número. */
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

/**
 * A partir de la grilla cruda + el mapeo de columnas elegido por el
 * usuario, devuelve las líneas limpias del estado de cuenta:
 * [{ fecha, descripcion, monto (signado: + ingreso, - egreso) }]
 * Ignora silenciosamente cualquier fila sin fecha o monto válidos
 * (encabezados, totales, filas de saldo inicial, etc.)
 */
export function normalizarLineasBanco(filas, mapeo) {
  const { colFecha, colDescripcion, modoMonto, colMonto, colDebito, colCredito } = mapeo;
  const out = [];
  filas.forEach((fila) => {
    const fecha = normalizarFecha(fila[colFecha]);
    if (!fecha) return;
    const descripcion = colDescripcion != null ? String(fila[colDescripcion] ?? "").trim() : "";

    let monto = null;
    if (modoMonto === "UNICA") {
      monto = normalizarMonto(fila[colMonto]);
    } else {
      const deb = normalizarMonto(fila[colDebito]) || 0;
      const cred = normalizarMonto(fila[colCredito]) || 0;
      if (deb === 0 && cred === 0) return;
      monto = cred - deb;
    }
    if (monto === null || monto === 0) return;

    out.push({ fecha, descripcion, monto });
  });
  return out;
}

/**
 * Empareja cada línea del banco contra los movimientos del sistema que
 * aún no están conciliados: mismo monto (con signo, tolerancia de 1
 * centavo) y fecha dentro de la ventana de tolerancia. Si hay exactamente
 * una coincidencia, se considera un match seguro; si hay varias posibles,
 * queda como "ambiguo" para que el usuario elija; si no hay ninguna,
 * queda como "solo en el banco" o "solo en el sistema".
 */
export function emparejarConciliacion(lineasBanco, movimientosPendientes, toleranciaDias = 3) {
  const usados = new Set();
  const matches = [];
  const ambiguos = [];
  const sinMatchEnSistema = [];

  const montoSignado = (m) => (m.tipo === "DEBITO" ? -m.monto : m.monto);

  lineasBanco.forEach((linea) => {
    const candidatos = movimientosPendientes.filter((m) => {
      if (usados.has(m.id)) return false;
      const mismoMonto = Math.abs(montoSignado(m) - linea.monto) < 0.01;
      if (!mismoMonto) return false;
      const dias = Math.abs((new Date(linea.fecha) - new Date(m.fecha)) / 86400000);
      return dias <= toleranciaDias;
    });

    if (candidatos.length === 1) {
      matches.push({ linea, movimiento: candidatos[0] });
      usados.add(candidatos[0].id);
    } else if (candidatos.length > 1) {
      ambiguos.push({ linea, candidatos });
    } else {
      sinMatchEnSistema.push(linea);
    }
  });

  const sinMatchEnBanco = movimientosPendientes.filter((m) => !usados.has(m.id) && !ambiguos.some((a) => a.candidatos.includes(m)));

  return { matches, ambiguos, sinMatchEnSistema, sinMatchEnBanco };
}
