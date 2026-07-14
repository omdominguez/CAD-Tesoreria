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
    /**
     * Corrige un pago ya registrado (solo Master, desde el Libro de Bancos).
     * No se borra el registro — se REVERSA el efecto que tuvo en el saldo del
     * banco de origen y se vuelve a aplicar con los datos corregidos, y queda
     * un rastro de auditoría (quién, cuándo, y qué decía antes de corregirlo).
     */
    editarMovimiento: (id, cambios, editadoPor) => {
      setSt((prev) => {
        const original = (prev.movimientos || []).find((m) => m.id === id);
        if (!original) return prev;

        let nuevosBancos = [...(prev.bancos || [])];

        // 1. Reversar el efecto que tuvo el monto ORIGINAL en el banco ORIGINAL
        if (original.tipo !== "CRUCE" && original.bancoOrigenId) {
          nuevosBancos = nuevosBancos.map((b) =>
            b.id === original.bancoOrigenId ? { ...b, saldoActual: Number(b.saldoActual) + Number(original.monto) } : b
          );
        }

        const corregido = { ...original, ...cambios };

        // 2. Aplicar el efecto del monto CORREGIDO en el banco (puede ser el mismo u otro)
        if (corregido.tipo !== "CRUCE" && corregido.bancoOrigenId) {
          nuevosBancos = nuevosBancos.map((b) =>
            b.id === corregido.bancoOrigenId ? { ...b, saldoActual: Number(b.saldoActual) - Number(corregido.monto) } : b
          );
        }

        // 3. Rastro de auditoría: guarda cómo estaba ANTES de esta corrección
        const snapshotAnterior = {
          monto: original.monto,
          moneda: original.moneda,
          fecha: original.fecha,
          referencia: original.referencia,
          bancoOrigenId: original.bancoOrigenId,
          editadoPor: editadoPor || null,
          fechaEdicion: new Date().toISOString().slice(0, 10)
        };

        const nuevosMovimientos = (prev.movimientos || []).map((m) =>
          m.id === id
            ? {
                ...corregido,
                editado: true,
                editadoPor: editadoPor || null,
                fechaEdicion: snapshotAnterior.fechaEdicion,
                historialEdiciones: [...(original.historialEdiciones || []), snapshotAnterior]
              }
            : m
        );

        const next = { ...prev, movimientos: nuevosMovimientos, bancos: nuevosBancos };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
