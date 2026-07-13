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
  };
}
