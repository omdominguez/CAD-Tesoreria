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
    eliminarTasaHistorica: (fecha) => {
      setSt((prev) => {
        const historialTasas = { ...(prev.historialTasas || {}) };
        delete historialTasas[fecha];
        const next = { ...prev, historialTasas };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
