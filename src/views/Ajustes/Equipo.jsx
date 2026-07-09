import React, { useState, useEffect } from "react";

// Servicios
import { listProfiles, setProfileRole } from "../../services/store";

// Constantes y Utilidades
import { C, ROLES } from "../../constants/theme";
import { fmtD } from "../../utils/finance";

// Componentes UI
import { Section, Card } from "../../components/ui/Layout";
import { Th, Td } from "../../components/ui/Table";
import { Select } from "../../components/ui/Forms";

export default function Equipo({ meId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    // Carga inicial de perfiles
    listProfiles()
      .then(setRows)
      .catch(console.error);
  }, []);

  const cambiar = async (id, rol) => {
    try {
      await setProfileRole(id, rol);
      // Refresca la lista automáticamente después de cambiar el rol
      setRows(await listProfiles());
    } catch (error) {
      console.error("Error al cambiar rol:", error);
      alert("Hubo un error al intentar actualizar el rol del usuario.");
    }
  };

  return (
    <Section 
      title="Equipo y accesos" 
      desc="Asigna el rol que define qué puede ver y hacer cada usuario."
    >
      {!rows ? (
        <div style={{ color: C.mut, fontSize: 13, padding: "8px 0" }}>
          Cargando usuarios del sistema…
        </div>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Usuario</Th>
                  <Th>Alta</Th>
                  <Th>Rol</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <Td bold>
                      {p.email}
                      {p.id === meId ? " (tú)" : ""}
                    </Td>
                    <Td>{fmtD((p.created_at || "").slice(0, 10))}</Td>
                    <Td>
                      <Select 
                        value={p.rol} 
                        onChange={(e) => cambiar(p.id, e.target.value)} 
                        style={{ maxWidth: 220 }}
                      >
                        {Object.entries(ROLES).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Section>
  );
}