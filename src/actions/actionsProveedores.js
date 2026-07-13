import { saveState } from "../services/store";

/** Acciones sobre el directorio de contactos (proveedores y/o clientes). */
export function crearAccionesProveedores(setSt, userId) {
  return {
    addProv: (p) => {
      setSt((prev) => {
        const next = { ...prev, proveedores: [...(prev.proveedores || []), { ...p, id: p.id || crypto.randomUUID() }] };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    updProv: (p) => {
      setSt((prev) => {
        const next = { ...prev, proveedores: (prev.proveedores || []).map((x) => (x.id === p.id ? p : x)) };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    delProv: (id) => {
      if (!window.confirm("¿Eliminar este contacto del directorio?")) return;
      setSt((prev) => {
        const next = { ...prev, proveedores: (prev.proveedores || []).filter((x) => x.id !== id) };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
