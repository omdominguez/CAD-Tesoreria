import { saveState } from "../services/store";

/** Acciones de Tesorería para pagar un compromiso puntual (no en lote/corrida). */
export function crearAccionesPagos(setSt, userId) {
  return {
    asignar: (id, bancoAsignadoId, prioridad, cuentaDestinoId) => {
      setSt((prev) => {
        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) => (c.id === id ? { ...c, bancoAsignadoId, prioridad, cuentaDestinoId } : c))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    addMovimiento: (mov) => {
      setSt((prev) => {
        const nuevosMovimientos = [...(prev.movimientos || []), { ...mov, id: crypto.randomUUID() }];
        const nuevosBancos = (prev.bancos || []).map((b) => {
          if (mov.tipo !== "CRUCE" && b.id === mov.bancoOrigenId) {
            return { ...b, saldoActual: Number(b.saldoActual) - Number(mov.monto) };
          }
          return b;
        });

        const next = { ...prev, movimientos: nuevosMovimientos, bancos: nuevosBancos };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
