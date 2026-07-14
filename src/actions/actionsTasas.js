import { saveState } from "../services/store";
import { conSnapshotDeHoy } from "../utils/finance";

/**
 * Acciones de configuración: las tasas de cambio del día.
 * @param {Function} setSt - el setState del estado global de la app
 * @param {string} userId - id del usuario actual (para saveState)
 */
export function crearAccionesTasas(setSt, userId) {
  return {
    setRate: (key, val) => {
      setSt((prev) => {
        const conConfig = { ...prev, config: { ...prev.config, [key]: val } };
        const next = conSnapshotDeHoy(conConfig);
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    marcarTasasAutoActualizadas: (fecha) => {
      setSt((prev) => {
        const next = { ...prev, tasasAutoActualizadas: fecha };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    /**
     * Agrega o corrige manualmente la "foto" de tasas de un día específico
     * en el historial — útil para rellenar días en los que nadie abrió el
     * sistema (y por lo tanto nunca se guardó su tasa), o para corregir un
     * valor que quedó mal. Los pagos que se registren con esa fecha usarán
     * automáticamente lo que se guarde aquí.
     */
    guardarTasaHistorica: (fecha, tasas) => {
      setSt((prev) => {
        const next = {
          ...prev,
          historialTasas: { ...(prev.historialTasas || {}), [fecha]: tasas }
        };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    /**
     * Carga en lote varios días al historial de tasas (para alimentar el
     * sistema desde un reporte histórico ya armado, en vez de día por día).
     * @param registros objeto { 'YYYY-MM-DD': { tasaBCV, tasaBcvEuro, tasaParalelo } }
     * @param sobrescribir si es false, los días que YA existen en el historial
     *   se dejan intactos (solo se agregan los que faltan); si es true, se
     *   reemplazan también. En ambos casos, la Intervención de un día que ya
     *   existía se PRESERVA (el reporte no la trae — se sigue poniendo a mano).
     */
    importarHistorialTasas: (registros, sobrescribir = false) => {
      setSt((prev) => {
        const historialTasas = { ...(prev.historialTasas || {}) };
        Object.entries(registros || {}).forEach(([fecha, t]) => {
          const existe = Boolean(historialTasas[fecha]);
          if (existe && !sobrescribir) return; // no pisar lo ya guardado
          const previo = historialTasas[fecha] || {};
          historialTasas[fecha] = {
            tasaBCV: Number(t.tasaBCV) || 0,
            tasaParalelo: Number(t.tasaParalelo) || 0,
            tasaBcvEuro: Number(t.tasaBcvEuro) || 0,
            tasaIntervencion: Number(previo.tasaIntervencion) || 0
          };
        });
        const next = { ...prev, historialTasas };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}