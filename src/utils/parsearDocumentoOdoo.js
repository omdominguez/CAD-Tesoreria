/* ============================================================
   PARSER DE DOCUMENTOS ODOO (Pedidos de compra / Facturas)
   ------------------------------------------------------------
   Toma el texto extraído de un PDF exportado por Odoo e intenta
   identificar: tipo y número de documento, RIF y nombre de la
   contraparte (proveedor o cliente), monto total, moneda, fecha y
   una descripción sugerida.

   IMPORTANTE: esto es una lectura automática best-effort sobre un
   formato de reporte que puede variar. Por diseño, SIEMPRE se
   muestra al usuario lo detectado para que lo confirme o corrija
   antes de guardar — nunca se guarda nada de forma silenciosa.
   ============================================================ */

function normalizarMonto(raw) {
  if (!raw) return null;
  // Los montos de Odoo en español vienen con punto de miles y coma decimal: 43.500,00
  const limpio = raw.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Porcentajes como "16.0%" o "16,0%" usan el punto/coma como DECIMAL, nunca como separador de miles. */
function normalizarPorcentaje(raw) {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function ddmmyyyyAyyyymmdd(raw) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw || "");
  if (!m) return null;
  const [, d, mo, y] = m;
  return `${y}-${mo}-${d}`;
}

/**
 * @param {string} texto - texto crudo extraído del PDF
 * @returns {{
 *   tipoDocumento: string|null, numeroDocumento: string|null,
 *   rif: string|null, nombreContraparte: string|null, confianzaNombre: 'alta'|'baja',
 *   monto: number|null, moneda: 'USD'|'BS', fecha: string|null,
 *   descripcionSugerida: string|null, advertencias: string[]
 * }}
 */
export function parsearDocumentoOdoo(texto) {
  const advertencias = [];

  // 1) Tipo y número de documento
  const mDoc = /(Pedido de compra|Factura|Nota de Entrega|Nota de Cr[eé]dito)\s*#?\s*([A-Za-z0-9\-\/]+)/i.exec(texto);
  const tipoDocumento = mDoc ? mDoc[1] : null;
  const numeroDocumento = mDoc ? mDoc[2] : null;
  if (!numeroDocumento) advertencias.push("No se pudo identificar el número de documento — revísalo manualmente.");

  // 2) RIF de la contraparte (el que aparece con la etiqueta "RIF:")
  const mRif = /RIF:?\s*([\d.\-]{6,})/.exec(texto);
  const rif = mRif ? mRif[1].replace(/\.$/, "") : null;
  if (!rif) advertencias.push("No se encontró un RIF etiquetado en el documento.");

  // 3) Nombre de la contraparte
  let nombreContraparte = null;
  let confianzaNombre = "baja";
  const mEnvio = /Direcci[oó]n de Env[ií]o\s+(.+)/.exec(texto);
  if (mEnvio) {
    nombreContraparte = mEnvio[1].trim();
    confianzaNombre = "alta";
  } else if (rif) {
    // Respaldo: la última razón social (con sufijo C.A./S.A.) antes del RIF etiquetado
    const bloqueAntes = texto.split(/RIF:?/)[0];
    const candidatos = [...bloqueAntes.matchAll(/([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ\s.\-]*?,?\s*(?:C\.?\s*A\.?|S\.?\s*A\.?))(?=\s|$)/g)];
    if (candidatos.length) {
      nombreContraparte = candidatos[candidatos.length - 1][1].trim().split("\n").pop().trim();
      confianzaNombre = "baja";
      advertencias.push("El nombre de la contraparte se detectó con baja confianza — revísalo con cuidado.");
    }
  }
  if (!nombreContraparte) advertencias.push("No se pudo sugerir un nombre de contraparte; búscalo manualmente.");

  // 4) Monto total (tomamos la última coincidencia de "Total")
  const totales = [...texto.matchAll(/Total\s+(Bs\.?|\$)?\s*([\d.,]+)/gi)];
  const ultimoTotal = totales[totales.length - 1];
  const monto = ultimoTotal ? normalizarMonto(ultimoTotal[2]) : null;
  const moneda = ultimoTotal && /Bs/i.test(ultimoTotal[1] || "") ? "BS" : "USD";
  if (!monto) advertencias.push("No se pudo leer el monto total — ingrésalo manualmente.");

  // 4.b) Desglose de impuestos: casi todos los pedidos de Odoo traen al final
  // el resumen "Base imponible / Impuestos / Total" en ese orden — si aparece,
  // se puede registrar la compra ya discriminada (base en USD + IVA aparte).
  const mResumenFiscal = /Base imponible\s*\$?\s*([\d.,]+)[\s\S]{0,120}?Impuestos\s*\$?\s*([\d.,]+)[\s\S]{0,120}?Total\s*\$?\s*([\d.,]+)/i.exec(texto);
  const baseImponible = mResumenFiscal ? normalizarMonto(mResumenFiscal[1]) : null;
  const impuestos = mResumenFiscal ? normalizarMonto(mResumenFiscal[2]) : null;

  // % de IVA: se toma de la primera línea "IVA (16.0%)" del detalle. Si el
  // documento mezclara líneas con distinto %, se avisa para que se revise
  // (el sistema solo puede aplicar un % único al separar el IVA).
  const pctsIva = [...new Set([...texto.matchAll(/IVA\s*\(([\d.,]+)\s*%\)/gi)].map((m) => m[1]))];
  const ivaPctDetectado = pctsIva.length ? normalizarPorcentaje(pctsIva[0]) : null;
  if (baseImponible && impuestos && pctsIva.length > 1) {
    advertencias.push(`El documento mezcla distintos % de IVA (${pctsIva.join(", ")}) — revisa el desglose antes de guardar.`);
  }

  // 5) Fecha del documento (primera fecha con formato DD/MM/AAAA seguida de hora)
  const mFecha = /(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/.exec(texto);
  const fecha = mFecha ? ddmmyyyyAyyyymmdd(mFecha[1]) : null;

  // 6) Descripción sugerida: línea(s) de producto entre el encabezado de tabla y "Base imponible"
  const mDesc = /Monto\n([\s\S]+?)\n\s*(?:Base imponible|Subtotal)/i.exec(texto);
  let descripcionSugerida = null;
  if (mDesc) {
    // Solo la primera línea de producto CON contenido (puede haber líneas en
    // blanco de por medio) — cortamos justo antes de la primera fecha
    // (DD/MM/AAAA) o etiqueta de impuesto, ahí termina el nombre y empiezan
    // los datos numéricos.
    const primeraLinea = (mDesc[1].split("\n").find((l) => l.trim().length > 0) || "");
    const corte = /\s+(?:Exento|IVA|\d{2}\/\d{2}\/\d{4})/i.exec(primeraLinea);
    descripcionSugerida = (corte ? primeraLinea.slice(0, corte.index) : primeraLinea).trim() || null;
  }

  return { tipoDocumento, numeroDocumento, rif, nombreContraparte, confianzaNombre, monto, moneda, fecha, descripcionSugerida, baseImponible, impuestos, ivaPctDetectado, advertencias };
}

/** Compara un RIF ignorando puntos, guiones y mayúsculas/minúsculas. */
export function normalizarRif(rif) {
  return (rif || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Busca un contacto existente por RIF (comparación tolerante). */
export function buscarContactoPorRif(contactos, rif) {
  const norm = normalizarRif(rif);
  if (!norm) return null;
  return (contactos || []).find((c) => normalizarRif(c.rif) === norm) || null;
}
