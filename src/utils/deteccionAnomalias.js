/* ============================================================
   DETECCIÓN DE DUPLICADOS Y MONTOS ATÍPICOS
   ------------------------------------------------------------
   Esto NO usa IA a propósito: comparar nombres de texto y detectar
   valores fuera de lo normal es más rápido, gratis y confiable con
   un algoritmo directo que llamando a un modelo de lenguaje para
   cada par de contactos — sería más lento y menos preciso. La IA
   se reserva para lo que sí necesita entender lenguaje natural
   (preguntas, categorización, resúmenes).
   ============================================================ */

/** Distancia de Levenshtein simple, para medir qué tan parecidos son dos textos. */
function distancia(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Normaliza un nombre para comparar: minúsculas, sin tildes, sin sufijos legales comunes, sin espacios extra. */
function normalizarNombre(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(c\.?a\.?|s\.?a\.?|compania anonima|sociedad anonima)\b/gi, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** % de similitud entre 0 y 100 basado en la distancia de edición sobre nombres ya normalizados. */
function similitud(a, b) {
  const na = normalizarNombre(a), nb = normalizarNombre(b);
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const d = distancia(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return Math.round((1 - d / maxLen) * 100);
}

/**
 * Busca pares de proveedores/clientes que probablemente sean el mismo
 * contacto capturado dos veces con el nombre escrito distinto (ej.
 * "Serving LC, C.A" vs "Serving LC C A"). No compara los que ya tienen
 * el mismo RIF exacto (esos no son "posibles" duplicados, son iguales).
 *
 * @returns [{ a, b, similitud }] ordenado de más a menos parecido
 */
export function detectarContactosDuplicados(proveedores, umbral = 75) {
  const lista = proveedores || [];
  const pares = [];
  for (let i = 0; i < lista.length; i++) {
    for (let j = i + 1; j < lista.length; j++) {
      const a = lista[i], b = lista[j];
      const mismoRif = a.rif && b.rif && a.rif.trim().toUpperCase() === b.rif.trim().toUpperCase();
      if (mismoRif) continue;
      const sim = similitud(a.razonSocial, b.razonSocial);
      if (sim >= umbral) pares.push({ a, b, similitud: sim });
    }
  }
  return pares.sort((x, y) => y.similitud - x.similitud);
}

/**
 * Busca compromisos cuyo monto se sale mucho de lo normal PARA ESE MISMO
 * PROVEEDOR — no un umbral fijo para toda la empresa, porque un
 * proveedor de fletes y uno de maquinaria tienen escalas de gasto
 * totalmente distintas. Un monto es "atípico" si se aleja más de
 * `desviaciones` desviaciones estándar del promedio histórico de ESE
 * proveedor (mínimo 4 pedidos previos para poder comparar).
 */
function mediana(valores) {
  const s = [...valores].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Busca compromisos cuyo monto se sale mucho de lo normal PARA ESE MISMO
 * PROVEEDOR — no un umbral fijo para toda la empresa, porque un
 * proveedor de fletes y uno de maquinaria tienen escalas de gasto
 * totalmente distintas. Un monto es "atípico" si su z-score robusto
 * (basado en MEDIANA y desviación absoluta mediana, no en promedio y
 * desviación estándar) supera el umbral — mínimo 4 pedidos previos para
 * poder comparar.
 *
 * Se usa mediana/MAD en vez de promedio/desviación estándar a propósito:
 * con pocos datos, un solo valor extremo infla tanto el promedio como la
 * desviación que termina "escondiendo" su propia anomalía (el valor
 * atípico arrastra el promedio hacia sí mismo). La mediana no tiene ese
 * problema — es el método recomendado (Iglewicz & Hoaglin) para detectar
 * outliers en muestras pequeñas.
 */
export function detectarMontosAtipicos(compromisos, montoUSDde, umbralZ = 3.5) {
  const porProveedor = {};
  (compromisos || []).forEach((c) => {
    if (c.anulado) return;
    (porProveedor[c.proveedorId] = porProveedor[c.proveedorId] || []).push(c);
  });

  const atipicos = [];
  Object.values(porProveedor).forEach((lista) => {
    if (lista.length < 4) return;
    const montos = lista.map((c) => montoUSDde(c));
    const med = mediana(montos);
    const mad = mediana(montos.map((m) => Math.abs(m - med)));
    if (mad === 0) return; // todos los montos iguales, nada que comparar

    lista.forEach((c, i) => {
      const zRobusto = (0.6745 * (montos[i] - med)) / mad;
      if (Math.abs(zRobusto) >= umbralZ) {
        atipicos.push({
          compromiso: c,
          montoUSD: montos[i],
          promedioProveedorUSD: med, // se muestra la mediana como referencia de "lo normal"
          vecesSobrePromedio: med > 0 ? montos[i] / med : null
        });
      }
    });
  });

  return atipicos.sort((a, b) => Math.abs(b.vecesSobrePromedio || 0) - Math.abs(a.vecesSobrePromedio || 0));
}
