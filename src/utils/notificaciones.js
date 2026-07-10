import { activo, activoCxC, usdComp, usdCxCPendiente, pendienteDe, pendienteCxC, provNom, hoy0, parseD, diasEntre } from "./finance";

/**
 * Genera la lista de alertas de pagos/cobros pendientes y vencidos,
 * filtrada según a quién le compete cada rol:
 *  - COMPRAS   → solo lo que hay que pagar a proveedores (CxP)
 *  - TESORERIA → ambos lados (CxP y CxC)
 *  - MASTER    → ambos lados
 *  - LECTOR    → ninguna (solo consulta, no gestiona)
 *
 * Incluye tanto lo ya vencido como lo que vence en los próximos 7 días.
 */
export function generarNotificaciones(st, rol) {
  const hoy = hoy0();
  const notifs = [];

  const verCxP = rol === "COMPRAS" || rol === "TESORERIA" || rol === "MASTER";
  const verCxC = rol === "TESORERIA" || rol === "MASTER";

  if (verCxP) {
    (st.compromisos || []).filter((c) => activo(st, c)).forEach((c) => {
      const dv = diasEntre(hoy, parseD(c.fechaVencimiento));
      if (dv > 7) return;
      notifs.push({
        id: c.id,
        tipo: "CxP",
        contacto: provNom(st, c.proveedorId),
        descripcion: c.descripcion || c.numeroPedidoOdoo || "Pedido de compra",
        monto: pendienteDe(st, c),
        montoUSD: usdComp(st, c),
        moneda: c.moneda,
        fechaVencimiento: c.fechaVencimiento,
        diasDiff: dv,
        vencido: dv < 0,
        registro: c
      });
    });
  }

  if (verCxC) {
    (st.cuentasCobrar || []).filter((c) => activoCxC(st, c)).forEach((c) => {
      const dv = diasEntre(hoy, parseD(c.fechaVencimiento));
      if (dv > 7) return;
      notifs.push({
        id: c.id,
        tipo: "CxC",
        contacto: provNom(st, c.clienteId),
        descripcion: c.descripcion || c.numeroFactura || "Factura de venta",
        monto: pendienteCxC(st, c),
        montoUSD: usdCxCPendiente(st, c),
        moneda: c.moneda,
        fechaVencimiento: c.fechaVencimiento,
        diasDiff: dv,
        vencido: dv < 0,
        registro: c
      });
    });
  }

  // Vencidos primero (los más atrasados arriba), luego los próximos por vencer
  notifs.sort((a, b) => a.diasDiff - b.diasDiff);
  return notifs;
}
