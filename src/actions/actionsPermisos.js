import { saveState } from "../services/store";

/**
 * Acción del Master para definir los permisos de un usuario. Se guardan en el
 * estado compartido (st.permisos[uid]); si un usuario no tiene entrada aquí,
 * usa por defecto la plantilla de su rol (ver utils/permisos.js).
 */
export function crearAccionesPermisos(setSt, userId) {
  return {
    setPermisosUsuario: (uid, permisos) => {
      setSt((prev) => {
        const next = { ...prev, permisos: { ...(prev.permisos || {}), [uid]: permisos } };
        saveState(next, userId).catch(console.error);
        return next;
      });
    }
  };
}
