/* ============================================================
   PARSER GENÉRICO DE COMPROBANTES DE PAGO
   ------------------------------------------------------------
   A diferencia del parser de pedidos de Odoo (que apunta a UN
   formato exacto y conocido), un comprobante de pago lo manda el
   cliente y puede venir de cualquier banco o método (Banesco,
   Mercantil, Zelle, Pago Móvil, BBVA, etc.), cada uno con su
   propio diseño: el monto puede venir antes o después de la
   moneda ("USD 755.99" o "27.485,00 USD" o "22.965.880,00 Bs"),
   y el formato del número (separador de miles/decimales) no
   depende de cuál sea la moneda. Por eso esta lectura es
   deliberadamente flexible en vez de apuntar a un solo patrón.

   SIEMPRE hay que mostrarle el resultado al usuario para que lo
   confirme — la precisión aquí es menor que con los pedidos de
   Odoo, sobre todo si el texto viene de una foto (OCR) o de un
   documento con tablas (que a veces parte los números entre
   líneas al convertirlos a texto plano).
   ============================================================ */

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
};

function buscarFecha(texto) {
  let m = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(texto);
  if (m) {
    const [, d, mo, y] = m;
    if (Number(mo) <= 12) return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  m = /(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (m) return m[0];
  m = /(\d{1,2})\s*(?:de\s*)?([A-Za-zñÑ]+)\s*(?:de\s*)?,?\s*(\d{4})/.exec(texto);
  if (m) {
    const mesNum = MESES[m[2].toLowerCase()];
    if (mesNum) return `${m[3]}-${String(mesNum).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  m = /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/.exec(texto);
  if (m) {
    const mesNum = MESES[m[1].toLowerCase()];
    if (mesNum) return `${m[3]}-${String(mesNum).padStart(2, "0")}-${String(m[2]).padStart(2, "0")}`;
  }
  return null;
}

/** Convierte un número escrito en CUALQUIERA de los dos estilos (1.234,56 o 1,234.56) a Number. */
function normalizarMontoGenerico(raw) {
  const limpio = raw.trim();
  const mDecimal = /([.,])(\d{2})$/.exec(limpio);
  if (!mDecimal) {
    const n = parseFloat(limpio.replace(/[.,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const separadorDecimal = mDecimal[1];
  const separadorMiles = separadorDecimal === "," ? "." : ",";
  const sinMiles = limpio.split(separadorMiles).join("");
  const n = parseFloat(sinMiles.replace(separadorDecimal, "."));
  return Number.isFinite(n) ? n : null;
}

const PALABRAS_CLAVE_MONTO = /monto|importe|total|transferir|transferid|abono|deposit|amount|sent|enviad/i;
const PALABRA_USD = /usd|us\$|\$/i;
const PALABRA_BS = /\bbs\.?s?\b/i;

/**
 * Busca todos los números con "cara" de monto (2 decimales, con separador
 * de miles opcional) en cualquiera de los dos estilos, y elige el más
 * probable según qué tan cerca esté de una palabra clave de monto y de
 * una etiqueta de moneda.
 */
function buscarMonto(texto) {
  const patronNumero = /\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/g;
  const candidatos = [];
  let m;
  while ((m = patronNumero.exec(texto))) {
    const inicio = m.index, fin = m.index + m[0].length;
    const contexto = texto.slice(Math.max(0, inicio - 25), Math.min(texto.length, fin + 25));
    candidatos.push({ raw: m[0], contexto });
  }
  if (!candidatos.length) return { monto: null, moneda: null };

  candidatos.sort((a, b) => {
    const pa = (PALABRAS_CLAVE_MONTO.test(a.contexto) ? 2 : 0) + (PALABRA_USD.test(a.contexto) || PALABRA_BS.test(a.contexto) ? 1 : 0);
    const pb = (PALABRAS_CLAVE_MONTO.test(b.contexto) ? 2 : 0) + (PALABRA_USD.test(b.contexto) || PALABRA_BS.test(b.contexto) ? 1 : 0);
    return pb - pa;
  });

  const elegido = candidatos[0];
  const moneda = PALABRA_USD.test(elegido.contexto) ? "USD" : PALABRA_BS.test(elegido.contexto) ? "BS" : null;
  return { monto: normalizarMontoGenerico(elegido.raw), moneda };
}

function buscarReferencia(texto) {
  const m = /(?:comprobante\s*nro\.?|referencia|confirmation(?:\s*number)?|nro\.?\s*(?:de\s*)?operaci[oó]n|n[uú]mero\s*de\s*operaci[oó]n|operaci[oó]n|ref\.?(?:\s*del?\s*abono)?)\s*[:#]?\s*([A-Za-z0-9\-]{4,})/i.exec(texto);
  return m ? m[1] : null;
}

/**
 * @param {string} texto - texto extraído del comprobante (PDF u OCR de imagen)
 * @returns {{ fecha: string|null, monto: number|null, moneda: string|null, referencia: string|null, advertencias: string[] }}
 */
export function parsearComprobantePago(texto) {
  const advertencias = [];
  const fecha = buscarFecha(texto);
  const { monto, moneda } = buscarMonto(texto);
  const referencia = buscarReferencia(texto);

  if (!fecha) advertencias.push("No se detectó una fecha — ingrésala manualmente.");
  if (!monto) advertencias.push("No se detectó un monto — ingrésalo manualmente.");
  if (monto && !moneda) advertencias.push("Se detectó un monto pero no quedó claro si es USD o Bs — verifícalo.");
  if (!referencia) advertencias.push("No se detectó un número de referencia (no es obligatorio).");

  return { fecha, monto, moneda: moneda || "USD", referencia, advertencias };
}
