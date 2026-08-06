import { saveState } from "../services/store";

/**
 * Seguimiento de ENTREGA física de un pedido — independiente de si ya está
 * pagado o no. Un pedido de materia prima, empaque o insumos puede llegar
 * en varios lotes a lo largo de varias semanas; esto registra qué ha
 * llegado y qué falta, sin mezclarse con el estado de pago.
 *
 * Se guarda en st.entregas, un objeto keyed por "claveEntrega" (ver
 * utils/finance.js → claveEntregaDe): { [clave]: { completo, eventos: [] } }
 */
export function crearAccionesEntregas(setSt, userId) {
  const actualizar = (clave, fn) => {
    setSt((prev) => {
      const actual = (prev.entregas || {})[clave] || { completo: false, eventos: [] };
      const next = {
        ...prev,
        entregas: { ...(prev.entregas || {}), [clave]: fn(actual) }
      };
      saveState(next, userId).catch(console.error);
      return next;
    });
  };

  return {
    /** Agrega un evento de entrega parcial (o total) con lo que llegó ese día. */
    registrarEntrega: (clave, evento) => {
      actualizar(clave, (actual) => ({
        ...actual,
        eventos: [
          ...actual.eventos,
          {
            id: "ent_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
            fecha: evento.fecha,
            descripcion: evento.descripcion || "",
            registradoPor: evento.registradoPor || "",
            adjuntos: evento.adjuntos || []
          }
        ]
      }));
    },

    eliminarEntrega: (clave, eventoId) => {
      actualizar(clave, (actual) => ({
        ...actual,
        eventos: actual.eventos.filter((e) => e.id !== eventoId)
      }));
    },

    /** Marca el pedido completo (todo llegó) o lo regresa a pendiente/parcial. */
    marcarEntregaCompleta: (clave, valor) => {
      actualizar(clave, (actual) => ({ ...actual, completo: valor }));
    }
  };
}
