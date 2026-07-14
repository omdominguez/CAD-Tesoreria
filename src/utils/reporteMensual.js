import { provNom, tasaDe, cobranzaAUsd } from "./finance";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

/** true si una fecha "YYYY-MM-DD" cae dentro del año/mes indicado (mes 0-11). */
function enMes(fechaStr, anio, mes) {
  if (!fechaStr) return false;
  const [y, m] = fechaStr.split("-").map(Number);
  return y === anio && m === mes + 1;
}

/** Convierte un movimiento de pago a su equivalente en USD, usando la tasa que quedó registrada en ese momento. */
function movimientoAUsd(m) {
  if (!m.moneda || m.moneda === "USD") return Number(m.monto);
  const tasa = Number(m.tasaBcvPago) || 1;
  return Number(m.monto) / tasa;
}

/**
 * Arma el resumen financiero de un mes calendario específico — compras,
 * pagos, ventas y cobros REALMENTE ocurridos ese mes (no saldos de
 * bancos, que el sistema no guarda como fotos históricas día a día;
 * ver la nota en la pantalla del reporte).
 *
 * @param {object} st - estado global de la app
 * @param {number} anio - ej. 2026
 * @param {number} mes - 0-11 (enero = 0)
 */
export function generarReporteMensual(st, anio, mes) {
  const compromisosDelMes = (st.compromisos || []).filter((c) => !c.anulado && enMes(c.fechaPedido, anio, mes));
  const movimientosDelMes = (st.movimientos || []).filter((m) => enMes(m.fecha, anio, mes) && m.tipo !== "CRUCE");
  const cxcDelMes = (st.cuentasCobrar || []).filter((c) => !c.anulado && enMes(c.fechaEmision, anio, mes));
  const cobranzasDelMes = (st.cobranzas || []).filter((c) => enMes(c.fecha, anio, mes));

  const totalCompras = compromisosDelMes.reduce((a, c) => a + (c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / tasaDe(st, c)), 0);
  const totalPagos = movimientosDelMes.reduce((a, m) => a + movimientoAUsd(m), 0);
  const totalVentas = cxcDelMes.reduce((a, c) => a + Number(c.montoOriginal), 0);
  const totalCobros = cobranzasDelMes.reduce((a, c) => a + cobranzaAUsd(c), 0);

  // Desglose de compras por categoría
  const porCategoriaMap = {};
  compromisosDelMes.forEach((c) => {
    const cat = c.categoria || "Otros";
    const usd = c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / tasaDe(st, c);
    porCategoriaMap[cat] = (porCategoriaMap[cat] || 0) + usd;
  });
  const porCategoria = Object.entries(porCategoriaMap)
    .map(([categoria, totalUSD]) => ({ categoria, totalUSD }))
    .sort((a, b) => b.totalUSD - a.totalUSD);

  // Top proveedores pagados en el mes
  const porProveedorMap = {};
  movimientosDelMes.forEach((m) => {
    const comp = (st.compromisos || []).find((c) => c.id === m.compromisoId);
    if (!comp) return;
    const nombre = provNom(st, comp.proveedorId);
    porProveedorMap[nombre] = (porProveedorMap[nombre] || 0) + movimientoAUsd(m);
  });
  const topProveedores = Object.entries(porProveedorMap)
    .map(([nombre, totalUSD]) => ({ nombre, totalUSD }))
    .sort((a, b) => b.totalUSD - a.totalUSD)
    .slice(0, 5);

  // Top clientes cobrados en el mes
  const porClienteMap = {};
  cobranzasDelMes.forEach((c) => {
    const nombre = provNom(st, c.clienteId);
    porClienteMap[nombre] = (porClienteMap[nombre] || 0) + cobranzaAUsd(c);
  });
  const topClientes = Object.entries(porClienteMap)
    .map(([nombre, totalUSD]) => ({ nombre, totalUSD }))
    .sort((a, b) => b.totalUSD - a.totalUSD)
    .slice(0, 5);

  return {
    anio,
    mes,
    etiqueta: `${MESES[mes]} ${anio}`,
    compras: { cantidad: compromisosDelMes.length, totalUSD: totalCompras },
    pagos: { cantidad: movimientosDelMes.length, totalUSD: totalPagos },
    ventas: { cantidad: cxcDelMes.length, totalUSD: totalVentas },
    cobros: { cantidad: cobranzasDelMes.length, totalUSD: totalCobros },
    balanceNeto: totalCobros - totalPagos,
    porCategoria,
    topProveedores,
    topClientes
  };
}

export { MESES };
