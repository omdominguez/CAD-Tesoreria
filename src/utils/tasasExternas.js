/* ============================================================
   FUENTES EXTERNAS DE TASAS DE CAMBIO
   ------------------------------------------------------------
   BCV ($ y €) se leen directo del JSON oficial de Banco de
   Venezuela (confirmado por el usuario). Paralelo sigue con
   DolarApi Venezuela, que ya funcionaba bien. Cada tasa intenta
   varias fuentes en orden; si todas fallan, devuelve null y la
   app simplemente deja la tasa en manual ese día.
   ============================================================ */

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/** Igual que normalizeNumber_ del script de Sheets: limpia símbolos y comas/puntos. */
function normalizarNumero(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  let s = String(raw ?? "").trim().replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Extrae el valor de una respuesta con forma { compra, venta, promedio, ... }. */
function extraerValor(data) {
  if (!data) return null;
  const crudo =
    data.promedio ?? data.venta ?? data.compra ?? data.value ?? data.rate ?? data.usd ?? data.tasa ?? data.price;
  const val = normalizarNumero(crudo);
  return val && val > 0 ? val : null;
}

/**
 * Fuente oficial de BCV ($ y €) juntos. Usamos chitty-bcv-api (alojada en
 * GitHub Pages, confirmada por el usuario) como principal — a diferencia
 * del JSON directo del Banco de Venezuela, este sí permite pedirse desde
 * el navegador (GitHub Pages no bloquea peticiones de otras páginas).
 * El del Banco de Venezuela queda como respaldo por si algún día cambia.
 */
export async function fetchTasasBDV() {
  try {
    const data = await fetchJSON("https://chitty400.github.io/chitty-bcv-api/latest.json");
    const dolar = normalizarNumero(data?.tasas?.usd ?? data?.tasa_bcv);
    const euro = normalizarNumero(data?.tasas?.eur);
    if (dolar || euro) return { dolar: dolar > 0 ? dolar : null, euro: euro > 0 ? euro : null };
  } catch (e) {
    console.warn("chitty-bcv-api: falló", e.message);
  }

  try {
    const data = await fetchJSON("https://www.bancodevenezuela.com/files/tasas/tasas2.json");
    const dolar = normalizarNumero(data?.mesacambio?.bcv?.dolares);
    const euro = normalizarNumero(data?.mesacambio?.bcv?.euros);
    return { dolar: dolar > 0 ? dolar : null, euro: euro > 0 ? euro : null };
  } catch (e) {
    console.warn("BDV (tasas2.json): falló", e.message);
    return { dolar: null, euro: null };
  }
}

/** Tasa oficial BCV (USD): Banco de Venezuela directo, con respaldo en DolarApi. */
export async function fetchTasaBCV() {
  const { dolar } = await fetchTasasBDV();
  if (dolar) return dolar;

  const fuentes = [
    "https://ve.dolarapi.com/v1/dolares/oficial",
    "https://dolar-vzla.rafnixg.dev/api/v1/bcv/dolar",
  ];
  for (const url of fuentes) {
    try {
      const val = extraerValor(await fetchJSON(url));
      if (val) return val;
    } catch (e) {
      console.warn("BCV: falló " + url, e.message);
    }
  }
  return null;
}

/** Referencia de mercado paralelo (P2P): DolarApi Venezuela, con respaldo. */
export async function fetchTasaParalelo() {
  const fuentes = [
    "https://ve.dolarapi.com/v1/dolares/paralelo",
    "https://dolar-vzla.rafnixg.dev/api/v1/binance/realtime_ves",
  ];
  for (const url of fuentes) {
    try {
      const val = extraerValor(await fetchJSON(url));
      if (val) return val;
    } catch (e) {
      console.warn("Paralelo: falló " + url, e.message);
    }
  }
  return null;
}

/** Tasa BCV Euro: Banco de Venezuela directo (el endpoint de DolarApi que se intentó antes no respondía). */
export async function fetchTasaBcvEuro() {
  const { euro } = await fetchTasasBDV();
  return euro || null;
}

/*
  Tasa de Intervención: no existe una fuente pública que publique
  exactamente este dato (ni la página del BCV ni ninguna API conocida
  lo exponen tal cual). Por eso NO se sincroniza sola en automático,
  para no reemplazar en silencio un número que puede venir de tu
  banco o de una fuente específica tuya.

  En su lugar, esta función calcula un "promedio sugerido" entre BCV
  y el paralelo (usando el endpoint /dolar_promedio de la misma API
  de rafnixg), que se muestra como una sugerencia junto al campo en
  Ajustes → Tasas. Tú decides si la usas o prefieres seguir
  ingresando tu propio número.
*/
export async function fetchSugerenciaIntervencion() {
  try {
    const val = extraerValor(await fetchJSON("https://dolar-vzla.rafnixg.dev/api/v1/dolar/dolar_promedio"));
    if (val) return val;
  } catch (e) {
    console.warn("Sugerencia de Intervención: falló el promedio", e.message);
  }
  return null;
}

// Se mantiene por compatibilidad: siempre devuelve null a propósito
// (Intervención nunca se auto-aplica en la sincronización silenciosa diaria).
export async function fetchTasaIntervencion() {
  return null;
}

/* ============================================================
   HISTORIAL DE TASAS (para ver la evolución mes a mes)
   ------------------------------------------------------------
   La fuente que teníamos documentada (bcv-api.rafnixg.dev) dejó de
   existir (su dominio ya no resuelve). La API nueva que sí funciona
   (dolar-vzla.rafnixg.dev) tiene un endpoint de historial
   (/api/v1/history/bcv), pero todavía no conocemos su formato exacto
   de parámetros y respuesta — por eso esta función queda desactivada
   A PROPÓSITO (devuelve un arreglo vacío, sin generar errores en la
   consola) en vez de adivinar una lectura que probablemente falle.

   Para completarla: en https://dolar-vzla.rafnixg.dev/docs, abre el
   bloque "/api/v1/history/bcv", haz clic en "Try it out" → "Execute",
   y comparte una captura de la respuesta de ejemplo.
   ============================================================ */
export async function fetchHistorialBCV(meses = 12) {
  return []; // pendiente — ver comentario arriba
}
