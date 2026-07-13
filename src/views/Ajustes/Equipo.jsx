import React, { useState, useEffect } from "react";
import { UserCheck, ShieldOff, Trash2 } from "lucide-react";

// Servicios
import { listProfiles, setProfileRole, aprobarUsuario, revocarUsuario, eliminarUsuario } from "../../services/store";

// Constantes y Utilidades
import { C, ROLES } from "../../constants/theme";
import { fmtD } from "../../utils/finance";

// Componentes UI
import { Section, Card } from "../../components/ui/Layout";
import { Th, Td } from "../../components/ui/Table";
import { Select } from "../../components/ui/Forms";
import { Btn } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";

export default function Equipo({ meId }) {
  const [rows, setRows] = useState(null);
  const [rolPendiente, setRolPendiente] = useState({}); // { [id]: rolElegido } mientras se aprueba

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
                        {p.id !== meId && (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Btn small variant="danger" onClick={() => revocar(p.id)}>
                              <ShieldOff size={13} /> Revocar
                            </Btn>
                            <Btn small variant="danger" onClick={() => eliminar(p.id, p.email)}>
                              <Trash2 size={13} /> Eliminar
                            </Btn>
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </Section>
  );
}
