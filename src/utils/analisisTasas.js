/* ============================================================
   ANÁLISIS DE TASAS DE CAMBIO
   ------------------------------------------------------------
   Funciones puras (sin UI) que toman el historial manual de
   tasas (st.historialTasas, cargado en Ajustes → Tasas) y lo
   convierten en las series y resúmenes que consume la vista de
   Reportes → Análisis de Tasas: evolución diaria, variación
   mes a mes, brecha cambiaria y comparativo año contra año.

   Todo sale del historial GUARDADO (no de fuentes externas), así
   que la herramienta funciona sin conexión y muestra exactamente
   la data que el equipo cargó y validó.
   ============================================================ */

/** Las tasas que se analizan, con su etiqueta y su rol en los gráficos. */
export const TASAS_META = [
  { key: "tasaBCV", label: "BCV ($)", corto: "BCV", colorVar: "verde" },
  { key: "tasaBcvEuro", label: "BCV (€)", corto: "Euro", colorVar: "azul" },
  { key: "tasaParalelo", label: "Paralelo", corto: "Paralelo", colorVar: "rojo" },
  { key: "tasaIntervencion", label: "Intervención", corto: "Interv.", colorVar: "gold" }
];

const NOMBRES_MES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const nombreMesCorto = (mesNum) => NOMBRES_MES[mesNum - 1] || "";

/** "2026-03" -> "Mar 26" */
export const etiquetaMes = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return `${NOMBRES_MES[m - 1]} ${String(y).slice(2)}`;
};

/**
 * historialTasas (objeto { 'YYYY-MM-DD': {tasaBCV,...} }) -> arreglo ordenado
 * cronológicamente [{ fecha, tasaBCV, tasaBcvEuro, tasaParalelo, tasaIntervencion }].
 */
export function serieHistorial(historialTasas) {
  return Object.entries(historialTasas || {})
    .map(([fecha, t]) => ({
      fecha,
      tasaBCV: Number(t?.tasaBCV) || 0,
      tasaBcvEuro: Number(t?.tasaBcvEuro) || 0,
      tasaParalelo: Number(t?.tasaParalelo) || 0,
      tasaIntervencion: Number(t?.tasaIntervencion) || 0
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Años presentes en la serie, ordenados: ['2025', '2026']. */
export function aniosDisponibles(serie) {
  return [...new Set(serie.map((r) => r.fecha.slice(0, 4)))].sort();
}

/** Filtra la serie por año ('2026') o la deja completa si es 'todos'. */
export function filtrarPorAnio(serie, anio) {
  return !anio || anio === "todos" ? serie : serie.filter((r) => r.fecha.slice(0, 4) === anio);
}

/**
 * Filtra la serie por un rango de fechas (inclusive). Cualquiera de los dos
 * extremos puede venir vacío: solo 'desde' = de esa fecha en adelante; solo
 * 'hasta' = hasta esa fecha; ambos vacíos = toda la serie. Las fechas van en
 * formato 'YYYY-MM-DD' (comparación de texto, que es segura en ese formato).
 */
export function filtrarPorRango(serie, desde, hasta) {
  return serie.filter((r) => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta));
}

/** Rango [min, max] de fechas presentes en la serie (o [null, null] si vacía). */
export function rangoFechas(serie) {
  if (!serie.length) return [null, null];
  return [serie[0].fecha, serie[serie.length - 1].fecha];
}

/** ¿Esa tasa tiene al menos un dato > 0 en la serie? (para no graficar líneas vacías). */
export function tasaTieneDatos(serie, key) {
  return serie.some((r) => r[key] > 0);
}

/**
 * Resumen mensual de UNA tasa: por cada mes (YYYY-MM) devuelve apertura
 * (primer día con dato), cierre (último), promedio, mínimo, máximo, cantidad
 * de días y la variación % del mes (cierre vs apertura). Ignora los días con
 * valor 0 (sin dato) para esa tasa.
 */
export function resumenMensual(serie, key) {
  const porMes = {};
  serie.forEach((r) => {
    if (!(r[key] > 0)) return;
    const mes = r.fecha.slice(0, 7);
    (porMes[mes] = porMes[mes] || []).push(r[key]);
  });
  return Object.keys(porMes)
    .sort()
    .map((mes) => {
      const v = porMes[mes];
      const apertura = v[0];
      const cierre = v[v.length - 1];
      const promedio = v.reduce((a, b) => a + b, 0) / v.length;
      const pct = apertura > 0 ? ((cierre - apertura) / apertura) * 100 : null;
      return { mes, apertura, cierre, promedio, min: Math.min(...v), max: Math.max(...v), dias: v.length, pct };
    });
}

/**
 * Tabla de comportamiento mensual combinada (para mostrar y exportar): una fila
 * por mes con cierre y variación % de cada tasa pedida. Solo incluye meses que
 * tengan al menos una tasa con dato.
 */
export function tablaComportamiento(serie, keys) {
  const resumenes = {};
  keys.forEach((k) => { resumenes[k] = resumenMensual(serie, k); });

  const meses = [...new Set(keys.flatMap((k) => resumenes[k].map((m) => m.mes)))].sort();

  return meses.map((mes) => {
    const fila = { mes };
    keys.forEach((k) => {
      const r = resumenes[k].find((x) => x.mes === mes) || null;
      fila[k] = r ? { cierre: r.cierre, promedio: r.promedio, pct: r.pct } : null;
    });
    return fila;
  });
}

/** Variación acumulada de una tasa entre el primer y el último dato de la serie. */
export function variacionAcumulada(serie, key) {
  const puntos = serie.filter((r) => r[key] > 0);
  if (puntos.length < 2) return null;
  const ini = puntos[0][key];
  const fin = puntos[puntos.length - 1][key];
  return {
    inicial: ini,
    final: fin,
    pct: ini > 0 ? ((fin - ini) / ini) * 100 : null,
    fechaInicial: puntos[0].fecha,
    fechaFinal: puntos[puntos.length - 1].fecha
  };
}

/**
 * Brecha cambiaria diaria: por cada fecha, cuánto % está el Paralelo y el Euro
 * POR ENCIMA del BCV oficial en dólares (la referencia base). Útil para ver
 * cómo se abre o se cierra la brecha a lo largo del tiempo.
 */
export function serieBrecha(serie) {
  return serie
    .filter((r) => r.tasaBCV > 0)
    .map((r) => ({
      fecha: r.fecha,
      brechaParalelo: r.tasaParalelo > 0 ? ((r.tasaParalelo - r.tasaBCV) / r.tasaBCV) * 100 : null,
      brechaEuro: r.tasaBcvEuro > 0 ? ((r.tasaBcvEuro - r.tasaBCV) / r.tasaBCV) * 100 : null
    }));
}

/**
 * Comparativo año contra año de UNA tasa, alineado por mes calendario. Para
 * cada mes (1..12) arma una fila con el valor de ese mes en cada año presente,
 * usando el promedio del mes o el cierre del mes según `modo`. Solo devuelve
 * los meses que tengan dato en al menos un año.
 *
 * @returns { anios: ['2025','2026'], filas: [{ mesNum, nombre, '2025': n, '2026': n }] }
 */
export function comparativoAnual(serie, key, modo = "promedio") {
  const anios = aniosDisponibles(serie);
  const acumulado = {}; // anio -> mesNum -> [valores en orden cronológico]

  serie.forEach((r) => {
    if (!(r[key] > 0)) return;
    const anio = r.fecha.slice(0, 4);
    const mesNum = Number(r.fecha.slice(5, 7));
    acumulado[anio] = acumulado[anio] || {};
    (acumulado[anio][mesNum] = acumulado[anio][mesNum] || []).push(r[key]);
  });

  const filas = [];
  for (let m = 1; m <= 12; m++) {
    const fila = { mesNum: m, nombre: NOMBRES_MES[m - 1] };
    let hayDato = false;
    anios.forEach((a) => {
      const v = acumulado[a]?.[m];
      if (v && v.length) {
        fila[a] = modo === "cierre" ? v[v.length - 1] : v.reduce((x, y) => x + y, 0) / v.length;
        hayDato = true;
      }
    });
    if (hayDato) filas.push(fila);
  }
  return { anios, filas };
}