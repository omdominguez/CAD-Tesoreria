import { saveState } from "../services/store";

/**
 * Acciones del módulo Banco: marcar movimientos/cobranzas como
 * conciliados contra el estado de cuenta real, y guardar el registro
 * formal de cada conciliación mensual (saldo según banco vs. según libros).
 */
export function crearAccionesConciliacion(setSt, userId) {
  return {
    /** origen: "movimiento" | "cobranza" */
    marcarConciliado: (origen, id, conciliado) => {
      setSt((prev) => {
        const campo = origen === "cobranza" ? "cobranzas" : "movimientos";
        const next = {
          ...prev,
          [campo]: (prev[campo] || []).map((r) => (r.id === id ? { ...r, conciliado } : r))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },

    /** Marca en lote todos los ids dados (de un mismo origen) como conciliados. */
    marcarConciliadoLote: (origen, ids, conciliado) => {
      setSt((prev) => {
        const campo = origen === "cobranza" ? "cobranzas" : "movimientos";
        const idsSet = new Set(ids);
        const next = {
          ...prev,
          [campo]: (prev[campo] || []).map((r) => (idsSet.has(r.id) ? { ...r, conciliado } : r))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },

    /** Guarda el cierre formal de una conciliación mensual de una cuenta. */
    guardarConciliacion: (registro) => {
      setSt((prev) => {
        const next = {
          ...prev,
          conciliaciones: [...(prev.conciliaciones || []), { ...registro, id: crypto.randomUUID() }]
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },

    eliminarConciliacion: (id) => {
      setSt((prev) => {
        const next = { ...prev, conciliaciones: (prev.conciliaciones || []).filter((c) => c.id !== id) };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
