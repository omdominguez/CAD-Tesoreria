import React, { useState, useEffect } from "react";
import { UserCheck, ShieldOff, Trash2, SlidersHorizontal } from "lucide-react";

// Servicios
import { listProfiles, setProfileRole, aprobarUsuario, revocarUsuario, eliminarUsuario } from "../../services/store";

// Constantes y Utilidades
import { C, ROLES } from "../../constants/theme";
import { fmtD } from "../../utils/finance";
import { CAPACIDADES, permisosEfectivos } from "../../utils/permisos";

// Componentes UI
import { Section, Card, Modal } from "../../components/ui/Layout";
import { Th, Td } from "../../components/ui/Table";
import { Select } from "../../components/ui/Forms";
import { Btn } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";

export default function Equipo({ meId, st, act }) {
  const [rows, setRows] = useState(null);
  const [rolPendiente, setRolPendiente] = useState({}); // { [id]: rolElegido } mientras se aprueba
  const [permisosDe, setPermisosDe] = useState(null); // perfil cuyos permisos se están editando

  useEffect(() => {
    listProfiles().then(setRows).catch(console.error);
  }, []);

  const refrescar = async () => setRows(await listProfiles());

  const cambiar = async (id, rol) => {
    try {
      await setProfileRole(id, rol);
      await refrescar();
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      alert("Hubo un error al intentar actualizar el rol del usuario.");
    }
  };

  const aprobar = async (id) => {
    try {
      const rol = rolPendiente[id] || "COMPRAS";
      await aprobarUsuario(id, rol);
      await refrescar();
    } catch (error) {
      console.error("Error al aprobar usuario:", error);
      alert("Hubo un error al intentar aprobar al usuario.");
    }
  };

  const revocar = async (id) => {
    if (!window.confirm("¿Quitarle el acceso a este usuario? Podrás volver a aprobarlo luego si hace falta.")) return;
    try {
      await revocarUsuario(id);
      await refrescar();
    } catch (error) {
      console.error("Error al revocar acceso:", error);
      alert("Hubo un error al intentar revocar el acceso.");
    }
  };

  const eliminar = async (id, email) => {
    if (!window.confirm(`¿Eliminar por completo la cuenta de ${email}? Esto no se puede deshacer, pero esa persona podrá registrarse de nuevo más adelante con el mismo correo si hace falta.`)) return;
    try {
      await eliminarUsuario(id);
      await refrescar();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      alert("Hubo un error al intentar eliminar la cuenta: " + (error.message || ""));
    }
  };

  const pendientes = (rows || []).filter((p) => !p.activo);
  const activos = (rows || []).filter((p) => p.activo);

  return (
    <Section
      title="Equipo y accesos"
      desc="Asigna el rol que define qué puede ver y hacer cada usuario, y autoriza las cuentas nuevas."
    >
      {!rows ? (
        <div style={{ color: C.mut, fontSize: 13, padding: "8px 0" }}>
          Cargando usuarios del sistema…
        </div>
      ) : (
        <>
          {pendientes.length > 0 && (
            <Card style={{ padding: 18, marginBottom: 16, borderLeft: `3px solid ${C.amar}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
                  {pendientes.length} cuenta(s) pendiente(s) de aprobación
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14 }}>
                Se registraron pero todavía no pueden entrar al sistema hasta que les asignes un rol y los autorices.
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {pendientes.map((p) => (
                  <div
                    key={p.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", background: C.amarSoft, borderRadius: 10 }}
                  >
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>
                        {p.nombre ? `${p.nombre} ${p.apellido || ""}`.trim() : p.email}
                      </div>
                      <div style={{ fontSize: 11, color: C.mut }}>
                        {p.nombre ? p.email + " · " : ""}Se registró el {fmtD((p.created_at || "").slice(0, 10))}
                      </div>
                    </div>
                    <Select
                      value={rolPendiente[p.id] || "COMPRAS"}
                      onChange={(e) => setRolPendiente((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      style={{ maxWidth: 200, marginBottom: 0 }}
                    >
                      {Object.entries(ROLES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </Select>
                    <Btn small onClick={() => aprobar(p.id)}>
                      <UserCheck size={13} /> Aprobar
                    </Btn>
                    <Btn small variant="danger" onClick={() => eliminar(p.id, p.email)}>
                      <Trash2 size={13} />
                    </Btn>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <Th>Usuario</Th>
                    <Th>Alta</Th>
                    <Th>Rol</Th>
                    <Th right>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map((p) => (
                    <tr key={p.id}>
                      <Td bold>
                        {p.nombre ? `${p.nombre} ${p.apellido || ""}`.trim() : p.email}
                        {p.id === meId ? " (tú)" : ""}
                        {p.nombre && <div style={{ fontSize: 11, color: C.mut, fontWeight: 400 }}>{p.email}</div>}
                      </Td>
                      <Td>{fmtD((p.created_at || "").slice(0, 10))}</Td>
                      <Td>
                        <Select
                          value={p.rol}
                          onChange={(e) => cambiar(p.id, e.target.value)}
                          style={{ maxWidth: 220, marginBottom: 0 }}
                        >
                          {Object.entries(ROLES).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </Select>
                      </Td>
                      <Td right>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {p.rol !== "MASTER" && (
                            <Btn small variant="ghost" onClick={() => setPermisosDe(p)}>
                              <SlidersHorizontal size={13} /> Permisos
                            </Btn>
                          )}
                          {p.id !== meId && (
                            <>
                              <Btn small variant="danger" onClick={() => revocar(p.id)}>
                                <ShieldOff size={13} /> Revocar
                              </Btn>
                              <Btn small variant="danger" onClick={() => eliminar(p.id, p.email)}>
                                <Trash2 size={13} /> Eliminar
                              </Btn>
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
      {permisosDe && (
        <PermisosModal
          perfil={permisosDe}
          permisosGuardados={st?.permisos?.[permisosDe.id]}
          onClose={() => setPermisosDe(null)}
          onSave={(permisos) => { act.setPermisosUsuario(permisosDe.id, permisos); setPermisosDe(null); }}
        />
      )}
    </Section>
  );
}

/* ============================================================
   MODAL: PERMISOS DE UN USUARIO
   ------------------------------------------------------------
   Prende/apaga capacidades por persona. Parte de la plantilla de
   su rol y guarda lo que ajuste el Master. El Master no aparece
   aquí (siempre tiene todo).
   ============================================================ */
function PermisosModal({ perfil, permisosGuardados, onClose, onSave }) {
  const [permisos, setPermisos] = useState(() => permisosEfectivos(perfil.rol, permisosGuardados));

  const toggle = (key) => setPermisos((prev) => ({ ...prev, [key]: !prev[key] }));

  const nombre = perfil.nombre ? `${perfil.nombre} ${perfil.apellido || ""}`.trim() : perfil.email;

  return (
    <Modal title={`Permisos · ${nombre}`} onClose={onClose}>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14, lineHeight: 1.5 }}>
        Rol base: <b style={{ color: C.ink }}>{ROLES[perfil.rol] || perfil.rol}</b>. Marca lo que esta
        persona puede ver y hacer. Si desmarcas "Ver disponibilidades bancarias", no verá saldos ni
        disponible en el Tablero.
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {CAPACIDADES.map((cap) => (
          <label
            key={cap.key}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.line}`, cursor: "pointer", background: permisos[cap.key] ? C.greenSoft : C.surface }}
          >
            <input type="checkbox" checked={!!permisos[cap.key]} onChange={() => toggle(cap.key)} style={{ marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{cap.label}</div>
              <div style={{ fontSize: 11.5, color: C.mut }}>{cap.desc}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => onSave(permisos)}>Guardar permisos</Btn>
      </div>
    </Modal>
  );
}
