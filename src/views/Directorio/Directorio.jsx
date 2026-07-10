import React, { useState } from "react";
import { Search, Users, FileText } from "lucide-react";

// Utilidades y Tema
import { C } from "../../constants/theme";
import { esProv, esCli, pendienteProv, pendienteCli, money } from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty } from "../../components/ui/Layout";
import { Segmented, Btn } from "../../components/ui/Buttons";
import { Input } from "../../components/ui/Forms";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

// Componentes Compartidos
import { ContactoFicha } from "../../components/shared/ContactoFicha";

export default function Directorio({ st }) {
  const [verProv, setVerProv] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");
  const [q, setQ] = useState("");
  
  // Lógica de filtrado y búsqueda
  const base = (st.proveedores || []).filter((p) => {
    if (filtro === "PROVEEDORES" && !esProv(p)) return false;
    if (filtro === "CLIENTES" && !esCli(p)) return false;
    
    if (q) {
      const search = q.toLowerCase();
      if (!((p.razonSocial || "").toLowerCase().includes(search) || (p.rif || "").toLowerCase().includes(search))) {
        return false;
      }
    }
    return true;
  });
  
  const pg = usePaged(base, 10);
  const provVer = verProv ? (st.proveedores || []).find((p) => p.id === verProv) : null;

  return (
    <Section 
      title="Cartera de Contactos" 
      desc="Busca un proveedor o cliente para ver sus saldos y su estado de cuenta detallado."
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <Segmented 
          value={filtro} 
          onChange={setFiltro} 
          options={[
            { id: "TODOS", label: "Todos" }, 
            { id: "PROVEEDORES", label: "Proveedores" }, 
            { id: "CLIENTES", label: "Clientes" }
          ]} 
        />
        
        <div style={{ position: "relative", minWidth: 220, flex: "0 1 300px" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: C.mut }} />
          <Input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Buscar por nombre o RIF…" 
            style={{ paddingLeft: 34, marginBottom: 0 }} 
          />
        </div>
      </div>
      
      {(st.proveedores || []).length === 0 ? (
        <Empty 
          icon={Users} 
          title="Cartera vacía" 
          msg="Ve a Ajustes para registrar empresas o personas." 
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Razón social</Th>
                  <Th>Perfil</Th>
                  <Th right>Por pagar (USD)</Th>
                  <Th right>Por cobrar (USD)</Th>
                  <Th right>Estado de cuenta</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((p) => {
                  const pendProv = esProv(p) ? pendienteProv(st, p.id) : 0;
                  const pendCli = esCli(p) ? pendienteCli(st, p.id) : 0;
                  
                  return (
                    <tr key={p.id}>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{p.razonSocial}</div>
                        <div style={{ fontSize: 11.5, color: C.mut }}>{p.rif}</div>
                      </Td>
                      <Td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {esProv(p) && <Badge tone="gold">Prov</Badge>}
                          {esCli(p) && <Badge tone="verde">Cli</Badge>}
                        </div>
                      </Td>
                      <Td right bold>
                        <span style={{ color: pendProv > 0.005 ? C.rojo : C.mut }}>
                          {pendProv > 0.005 ? money(pendProv) : "—"}
                        </span>
                      </Td>
                      <Td right bold>
                        <span style={{ color: pendCli > 0.005 ? C.verde : C.mut }}>
                          {pendCli > 0.005 ? money(pendCli) : "—"}
                        </span>
                      </Td>
                      <Td right>
                        <Btn small variant="ghost" onClick={() => setVerProv(p.id)}>
                          <FileText size={13} /> Ver estado
                        </Btn>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} />
        </Card>
      )}
      
      {/* Modal importado desde shared */}
      {provVer && (
        <ContactoFicha 
          st={st} 
          prov={provVer} 
          onClose={() => setVerProv(null)} 
        />
      )}
    </Section>
  );
}