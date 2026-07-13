import { saveState } from "../services/store";

/**
 * Acciones del módulo de Compras: crear pedidos (con o sin
 * financiamiento en cuotas), adjuntar documentos, y anular.
 * El pago en sí (asignar banco, registrar transferencia) vive en
 * actionsPagos.js — es responsabilidad de Tesorería, no de Compras.
 */
export function crearAccionesCompras(setSt, userId) {
  return {
    addCompromisoMulti: (listaCuotas) => {
      setSt((prev) => {
        const nuevosCompromisos = [...(prev.compromisos || [])];
        const nuevosMovimientos = [...(prev.movimientos || [])];
        const nuevosBancos = [...(prev.bancos || [])];

        listaCuotas.forEach(({ data, anticipo }) => {
          const compId = crypto.randomUUID();
          nuevosCompromisos.push({ ...data, id: compId, anulado: false, corridaId: null });

          if (anticipo) {
            const movId = crypto.randomUUID();
            nuevosMovimientos.push({
              id: movId,
              compromisoId: compId,
              monto: anticipo.monto,
              fecha: anticipo.fecha,
              tipo: anticipo.tipo,
              bancoOrigenId: anticipo.bancoOrigenId,
              referencia: anticipo.referencia,
              adjuntos: []
            });

            if (anticipo.bancoOrigenId) {
              const bIndex = nuevosBancos.findIndex((b) => b.id === anticipo.bancoOrigenId);
              if (bIndex !== -1) {
                nuevosBancos[bIndex] = {
                  ...nuevosBancos[bIndex],
                  saldoActual: Number(nuevosBancos[bIndex].saldoActual) - Number(anticipo.monto)
                };
              }
            }
          }
        });

        const next = { ...prev, compromisos: nuevosCompromisos, movimientos: nuevosMovimientos, bancos: nuevosBancos };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    setAdjCompromiso: (id, adjuntos) => {
      setSt((prev) => {
        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) => (c.id === id ? { ...c, adjuntos } : c))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    delCompromiso: (id) => {
      if (!window.confirm("¿Anular este compromiso de pago?")) return;
      setSt((prev) => {
        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) => (c.id === id ? { ...c, anulado: true } : c))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
