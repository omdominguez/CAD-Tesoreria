/* ============================================================
   CONTROL DE COSTOS POR CATEGORÍA
   ------------------------------------------------------------
   A diferencia del flujo de caja (que mira cuándo se PAGA), esto
   mira cuándo se GENERÓ el gasto (fecha del pedido), sin importar
   si ya está pagado o sigue pendiente — es la pregunta de gestión
   "¿en qué se está gastando?", no la de tesorería "¿qué falta
   pagar?". Por eso usa el monto TOTAL del compromiso (montoOriginal
   convertido a USD), no el saldo pendiente.
   ============================================================ */

import { tasaDe } from "./finance";

/** Monto total (no el pendiente) de un compromiso, convertido a USD. */
function montoTotalUSD(st, c) {
  return c.moneda === "USD" ? Number(c.montoOriginal) || 0 : (Number(c.montoOriginal) || 0) / tasaDe(st, c);
}

/**
 * Desglosa el gasto por categoría dentro de un rango de fechas (según
 * fechaPedido). Devuelve también el detalle mes a mes de cada categoría,
 * para poder graficar la tendencia en el tiempo.
 *
 * @returns {
 *   totalUSD, cantidad,
 *   porCategoria: [{ categoria, totalUSD, cantidad, pct }] (de mayor a menor),
 *   porMes: [{ mes: 'YYYY-MM', totalesPorCategoria: { [categoria]: usd } }]
 * }
 */
export function calcularCostosPorCategoria(st, desde, hasta) {
  const compromisos = (st.compromisos || []).filter((c) => {
    if (c.anulado) return false;
    const f = c.fechaPedido || c.fechaVencimiento;
    if (!f) return false;
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });

  const porCategoriaMap = {};
  const porMesMap = {};

  compromisos.forEach((c) => {
    const cat = c.categoria || "Sin categoría";
    const usd = montoTotalUSD(st, c);
    const mes = (c.fechaPedido || c.fechaVencimiento).slice(0, 7);

    if (!porCategoriaMap[cat]) porCategoriaMap[cat] = { categoria: cat, totalUSD: 0, cantidad: 0 };
    porCategoriaMap[cat].totalUSD += usd;
    porCategoriaMap[cat].cantidad += 1;

    if (!porMesMap[mes]) porMesMap[mes] = { mes, totalesPorCategoria: {} };
    porMesMap[mes].totalesPorCategoria[cat] = (porMesMap[mes].totalesPorCategoria[cat] || 0) + usd;
  });

  const totalUSD = Object.values(porCategoriaMap).reduce((a, c) => a + c.totalUSD, 0);
  const porCategoria = Object.values(porCategoriaMap)
    .map((c) => ({ ...c, pct: totalUSD > 0 ? (c.totalUSD / totalUSD) * 100 : 0 }))
    .sort((a, b) => b.totalUSD - a.totalUSD);

  const porMes = Object.values(porMesMap).sort((a, b) => a.mes.localeCompare(b.mes));

  return { totalUSD, cantidad: compromisos.length, porCategoria, porMes };
}

/** Todas las categorías que aparecen en porMes, en el mismo orden de porCategoria (mayor a menor gasto). */
export function categoriasOrdenadas(resultado) {
  return resultado.porCategoria.map((c) => c.categoria);
}