import { saveState } from "../services/store";

/** Acciones del lado de ventas: facturas por cobrar y los cobros que las van cerrando. */
export function crearAccionesVentas(setSt, userId) {
  return {
    addCxC: (cxc) => {
      setSt((prev) => {
        const next = {
          ...prev,
          cuentasCobrar: [...(prev.cuentasCobrar || []), { ...cxc, id: crypto.randomUUID(), anulado: false }]
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    delCxC: (id) => {
      if (!window.confirm("¿Seguro que deseas anular esta factura de venta?")) return;
      setSt((prev) => {
        const next = {
          ...prev,
          cuentasCobrar: (prev.cuentasCobrar || []).map((c) => (c.id === id ? { ...c, anulado: true } : c))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },

    addCobranza: (cob) => {
      setSt((prev) => {
        const next = {
          ...prev,
          cobranzas: [...(prev.cobranzas || []), { ...cob, id: crypto.randomUUID() }],
          bancos: (prev.bancos || []).map((b) =>
            b.id === cob.bancoDestinoId ? { ...b, saldoActual: Number(b.saldoActual) + Number(cob.monto) } : b
          )
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    delCobranza: (id) => {
      setSt((prev) => {
        const target = (prev.cobranzas || []).find((c) => c.id === id);
        if (!target) return prev;

        const next = {
          ...prev,
          cobranzas: (prev.cobranzas || []).filter((c) => c.id !== id),
          bancos: (prev.bancos || []).map((b) =>
            b.id === target.bancoDestinoId ? { ...b, saldoActual: Number(b.saldoActual) - Number(target.monto) } : b
          )
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
