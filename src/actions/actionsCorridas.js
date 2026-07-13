import { saveState } from "../services/store";
import { tasaSegunFormaPago } from "../utils/finance";

/**
 * Acciones de las corridas de pago: el reemplazo digital del papel de
 * "Anticipo a Proveedores" — crear el lote, autorizarlo/rechazarlo
 * (gerencia), y ejecutarlo (Tesorería transfiere de verdad).
 */
export function crearAccionesCorridas(setSt, userId) {
  return {
    crearCorrida: (compromisoIds, rol, creadoPor) => {
      setSt((prev) => {
        const corrId = crypto.randomUUID();
        const correlativo = (prev.corridas || []).length + 1;
        const hoy = new Date().toISOString().slice(0, 10);
        const esMaster = rol === "MASTER";
        const nuevaCorrida = {
          id: corrId,
          codigo: `CORR-${String(correlativo).padStart(4, "0")}`,
          compromisoIds,
          estado: esMaster ? "AUTORIZADA" : "PENDIENTE_AUTORIZACION",
          fechaCreacion: hoy,
          creadoPor: creadoPor || null,
          // Si quien arma la corrida ya es Master, esa misma acción cuenta como la autorización
          autorizadoPor: esMaster ? creadoPor || null : null,
          fechaAutorizacion: esMaster ? hoy : null
        };

        const nuevosCompromisos = (prev.compromisos || []).map((c) =>
          compromisoIds.includes(c.id) ? { ...c, corridaId: corrId } : c
        );

        const next = {
          ...prev,
          corridas: [...(prev.corridas || []), nuevaCorrida],
          compromisos: nuevosCompromisos
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    aprobarCorrida: (id, autorizadoPor) => {
      setSt((prev) => {
        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((co) => (co.id === id ? { ...co, estado: "AUTORIZADA", autorizadoPor: autorizadoPor || null, fechaAutorizacion: new Date().toISOString().slice(0, 10) } : co))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    rechazarCorrida: (id, rechazadoPor) => {
      setSt((prev) => {
        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((co) => (co.id === id ? { ...co, estado: "RECHAZADA", rechazadoPor: rechazadoPor || null, fechaRechazo: new Date().toISOString().slice(0, 10) } : co)),
          compromisos: (prev.compromisos || []).map((c) => (c.corridaId === id ? { ...c, corridaId: null } : c))
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    ejecutarCorrida: (id, ejecutadoPor) => {
      setSt((prev) => {
        const co = (prev.corridas || []).find((x) => x.id === id);
        if (!co) return prev;

        const nuevosMovimientos = [...(prev.movimientos || [])];
        const nuevosBancos = [...(prev.bancos || [])];

        // Se asume un banco por defecto en Bs asignado a los compromisos o el primero disponible
        (prev.compromisos || [])
          .filter((c) => co.compromisoIds.includes(c.id))
          .forEach((c) => {
            const bId = c.bancoAsignadoId || (prev.bancos || []).find((b) => b.moneda === "BS")?.id;
            // El pedido vive en USD; la corrida se paga en Bs — convertimos con
            // la tasa que corresponda según la forma de pago de este compromiso
            // (BCV, Paralelo o Euro), igual que el pago individual manual.
            const tasaAplicable = tasaSegunFormaPago(prev, c.formaPago || c.moneda);
            const montoBs = tasaAplicable !== null ? Number(c.montoOriginal) * tasaAplicable : Number(c.montoOriginal);

            nuevosMovimientos.push({
              id: crypto.randomUUID(),
              compromisoId: c.id,
              monto: montoBs,
              moneda: "BS",
              tasaBcvPago: tasaAplicable !== null ? tasaAplicable : null,
              fecha: new Date().toISOString().slice(0, 10),
              tipo: "TRANSFERENCIA",
              bancoOrigenId: bId,
              referencia: `Ejecución Lote ${co.codigo}`,
              adjuntos: []
            });

            if (bId) {
              const idx = nuevosBancos.findIndex((b) => b.id === bId);
              if (idx !== -1) {
                nuevosBancos[idx] = {
                  ...nuevosBancos[idx],
                  saldoActual: Number(nuevosBancos[idx].saldoActual) - Number(montoBs)
                };
              }
            }
          });

        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((x) => (x.id === id ? { ...x, estado: "EJECUTADA", ejecutadoPorAdmin: ejecutadoPor || null, fechaEjecucion: new Date().toISOString().slice(0, 10) } : x)),
          movimientos: nuevosMovimientos,
          bancos: nuevosBancos
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
