import { saveState } from "../services/store";

/** Acciones sobre las cuentas bancarias PROPIAS de CAD (no las de proveedores). */
export function crearAccionesBancos(setSt, userId) {
  return {
    addBanco: (bco) => {
      setSt((prev) => {
        const next = { ...prev, bancos: [...(prev.bancos || []), { ...bco, id: crypto.randomUUID() }] };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    updBanco: (bco) => {
      setSt((prev) => {
        const next = { ...prev, bancos: (prev.bancos || []).map((b) => (b.id === bco.id ? bco : b)) };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
    delBanco: (id) => {
      if (!window.confirm("¿Seguro que deseas eliminar esta cuenta bancaria?")) return;
      setSt((prev) => {
        const next = { ...prev, bancos: (prev.bancos || []).filter((b) => b.id !== id) };
        saveState(next, userId).catch(console.error);
        return next;
      });
    },
  };
}
