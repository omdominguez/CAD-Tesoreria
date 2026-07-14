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
    /**
     * Migración de un solo uso: a las compras financiadas creadas ANTES de
     * que existiera grupoFinanciamientoId (cuotas sueltas sin identificador
     * compartido), les asigna uno retroactivamente agrupándolas por mismo
     * proveedor + misma descripción base (sin el "(Cuota X/Y...)" al final).
     * Los compromisos que ya tengan grupo, o que sean únicos, no se tocan.
     */
    agruparCuotasAntiguas: () => {
      let cantidadAgrupada = 0;
      setSt((prev) => {
        const sinGrupo = (prev.compromisos || []).filter((c) => !c.grupoFinanciamientoId);
        const claveDe = (c) => `${c.proveedorId}||${(c.descripcion || "").replace(/\s*\(.*?\)\s*$/, "").trim()}`;

        const grupos = {};
        sinGrupo.forEach((c) => {
          const clave = claveDe(c);
          if (!grupos[clave]) grupos[clave] = [];
          grupos[clave].push(c.id);
        });

        const idsPorGrupo = {}; // compromisoId -> nuevo grupoFinanciamientoId
        Object.values(grupos).forEach((ids) => {
          if (ids.length < 2) return; // no hay nada que agrupar si es un pedido suelto
          const nuevoGrupoId = crypto.randomUUID();
          ids.forEach((id) => { idsPorGrupo[id] = nuevoGrupoId; });
        });

        cantidadAgrupada = Object.keys(idsPorGrupo).length;

        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) =>
            idsPorGrupo[c.id] ? { ...c, grupoFinanciamientoId: idsPorGrupo[c.id] } : c
          )
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
      return cantidadAgrupada;
    },
    /**
     * Corrige retroactivamente las fechas de vencimiento de las cuotas
     * "Cuota X/Y" de un mismo financiamiento (grupoFinanciamientoId), por si
     * quedaron todas con la misma fecha en vez de escalonadas. Los pagos
     * iniciales ("Inicial") no se tocan — solo las cuotas del saldo.
     */
    recalcularFechasGrupo: (grupoId, fechaInicio, frecuencia) => {
      setSt((prev) => {
        const delGrupo = (prev.compromisos || []).filter((c) => c.grupoFinanciamientoId === grupoId);

        // Extraemos el número de cuota "(Cuota 5/36...)" para ordenarlas bien
        const conNumero = delGrupo
          .map((c) => {
            const m = (c.descripcion || "").match(/\(Cuota (\d+)\/(\d+)/);
            return m ? { id: c.id, n: Number(m[1]) } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.n - b.n);

        const nuevasFechas = {};
        let d = new Date(fechaInicio + "T00:00:00");
        conNumero.forEach((item, i) => {
          nuevasFechas[item.id] = d.toISOString().slice(0, 10);
          if (frecuencia === "MENSUAL") d.setMonth(d.getMonth() + 1);
          else if (frecuencia === "QUINCENAL") d.setDate(d.getDate() + 15);
          else if (frecuencia === "SEMANAL") d.setDate(d.getDate() + 7);
        });

        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) =>
            nuevasFechas[c.id] ? { ...c, fechaVencimiento: nuevasFechas[c.id] } : c
          )
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
