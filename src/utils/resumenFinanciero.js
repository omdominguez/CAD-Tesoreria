/* ============================================================
   RESUMEN FINANCIERO PARA LA IA
   ------------------------------------------------------------
   La IA no recibe el estado completo del sistema (por privacidad
   y para no gastar tokens de más) — recibe este resumen curado:
   totales, los proveedores/clientes con más deuda, próximos
   vencimientos, y disponible en bancos. Suficiente para responder
   la mayoría de preguntas de gestión sin exponer todo el detalle
   línea por línea.
   ============================================================ */

import { activo, activoCxC, usdComp, usdCxCPendiente, provNom, brutoUSD, hoy0, parseD, diasEntre } from "./finance";

export function construirResumenFinanciero(st) {
  const hoy = hoy0();

  const disponibleUSD = (st.bancos || []).reduce((a, b) => a + brutoUSD(st, b), 0);
  const porBanco = (st.bancos || []).map((b) => ({ banco: b.nombre, moneda: b.moneda, disponibleUSD: Math.round(brutoUSD(st, b)) }));

  const porPagar = (st.compromisos || []).filter((c) => activo(st, c));
  const porCobrar = (st.cuentasCobrar || []).filter((c) => activoCxC(st, c));

  const totalPorPagarUSD = porPagar.reduce((a, c) => a + usdComp(st, c), 0);
  const totalPorCobrarUSD = porCobrar.reduce((a, c) => a + usdCxCPendiente(st, c), 0);

  // Top 5 proveedores con más deuda, agrupado
  const deudaPorProveedor = {};
  porPagar.forEach((c) => {
    const nombre = provNom(st, c.proveedorId);
    deudaPorProveedor[nombre] = (deudaPorProveedor[nombre] || 0) + usdComp(st, c);
  });
  const topProveedores = Object.entries(deudaPorProveedor)
    .map(([proveedor, usd]) => ({ proveedor, deudaUSD: Math.round(usd) }))
    .sort((a, b) => b.deudaUSD - a.deudaUSD)
    .slice(0, 5);

  // Top 5 clientes con más por cobrar
  const porCobrarPorCliente = {};
  porCobrar.forEach((c) => {
    const nombre = provNom(st, c.clienteId);
    porCobrarPorCliente[nombre] = (porCobrarPorCliente[nombre] || 0) + usdCxCPendiente(st, c);
  });
  const topClientes = Object.entries(porCobrarPorCliente)
    .map(([cliente, usd]) => ({ cliente, porCobrarUSD: Math.round(usd) }))
    .sort((a, b) => b.porCobrarUSD - a.porCobrarUSD)
    .slice(0, 5);

  // Próximos vencimientos (7 días) de pago
  const proximosPagos = porPagar
    .filter((c) => diasEntre(hoy, parseD(c.fechaVencimiento)) <= 7)
    .map((c) => ({
      proveedor: provNom(st, c.proveedorId),
      descripcion: c.descripcion,
      montoUSD: Math.round(usdComp(st, c)),
      vence: c.fechaVencimiento,
      vencido: diasEntre(hoy, parseD(c.fechaVencimiento)) < 0
    }))
    .slice(0, 15);

  return {
    fecha: hoy.toISOString().slice(0, 10),
    disponibleTotalUSD: Math.round(disponibleUSD),
    porBanco,
    totalPorPagarUSD: Math.round(totalPorPagarUSD),
    totalPorCobrarUSD: Math.round(totalPorCobrarUSD),
    posicionNetaUSD: Math.round(disponibleUSD + totalPorCobrarUSD - totalPorPagarUSD),
    topProveedoresConDeuda: topProveedores,
    topClientesPorCobrar: topClientes,
    proximosVencimientosDePago: proximosPagos
  };
}
