import React, { useState } from "react";
import { Plus, Trash2, Pencil, Users, X } from "lucide-react";

// Tema y Utilidades
import { C } from "../../constants/theme";
import { esProv, esCli, bancosProv } from "../../utils/finance";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Field, Input } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

export default function GestorContactos({ st, act }) {
  // modalData: null = cerrado, { type: 'new' | 'edit', data: obj }
  const [modalData, setModalData] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");

  // Filtrado de la lista según el tab seleccionado
  const lista = (st.proveedores || []).filter((p) => {
    if (filtro === "PROVEEDORES" && !esProv(p)) return false;
    if (filtro === "CLIENTES" && !esCli(p)) return false;
    return true;
  });

  return (
    <Section 
      title="Gestor de Contactos" 
      desc="Crea o edita la base de datos de clientes y proveedores." 
      action={
        <Btn onClick={() => setModalData({ type: "new", data: null })}>
          <Plus size={15} /> Agregar contacto
        </Btn>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Segmented 
          value={filtro} 
          onChange={setFiltro} 
          options={[
            { id: "TODOS", label: "Todos" }, 
            { id: "PROVEEDORES", label: "Proveedores" }, 
            { id: "CLIENTES", label: "Clientes" }
          ]} 
        />
      </div>

      {(st.proveedores || []).length === 0 ? (
        <Empty 
          icon={Users} 
          title="Directorio vacío" 
          msg="Registra empresas o personas." 
          action={
            <Btn onClick={() => setModalData({ type: "new", data: null })}>
              <Plus size={15} /> Agregar contacto
            </Btn>
          } 
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>RIF</Th>
                  <Th>Razón social</Th>
                  <Th>Perfil</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <Td>{p.rif}</Td>
                    <Td bold>{p.razonSocial}</Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {esProv(p) && <Badge tone="gold">Prov</Badge>}
                        {esCli(p) && <Badge tone="verde">Cli</Badge>}
                      </div>
                    </Td>
                    <Td right>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" onClick={() => setModalData({ type: "edit", data: p })}>
                          <Pencil size={13} />
                        </Btn>
                        <Btn small variant="danger" onClick={() => act.delProv(p.id)}>
                          <Trash2 size={13} />
                        </Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Renderizado Aislado del Modal */}
      {modalData && (
        <ContactoModal 
          initialData={modalData.data} 
          onClose={() => setModalData(null)}
          onSave={(data) => {
            modalData.type === "edit" ? act.updProv(data) : act.addProv(data);
            setModalData(null);
          }}
        />
      )}
    </Section>
  );
}

/* ============================================================
   COMPONENTE AISLADO: FORMULARIO DE CONTACTO
   ============================================================ */
function ContactoModal({ initialData, onClose, onSave }) {
  // Construye el estado inicial basado en si estamos editando o creando
  const getInitialState = () => {
    if (initialData) {
      const cuentasExisten = bancosProv(initialData);
      return { 
        ...initialData, 
        bancos: cuentasExisten.length ? cuentasExisten : [{ banco: "", cuenta: "" }], 
        esProveedor: esProv(initialData), 
        esCliente: esCli(initialData) 
      };
    }
    return { 
      rif: "", 
      razonSocial: "", 
      bancos: [{ banco: "", cuenta: "" }], 
      esProveedor: true, 
      esCliente: false 
    };
  };

  const [f, setF] = useState(getInitialState());

  // Utilidades para manejar el arreglo dinámico de bancos
  const setBco = (i, key, val) => setF((prev) => { 
    const bancos = [...(prev.bancos || [])]; 
    bancos[i] = { ...bancos[i], [key]: val }; 
    return { ...prev, bancos }; 
  });
  
  const addBco = () => setF((prev) => ({ 
    ...prev, 
    bancos: [...(prev.bancos || []), { banco: "", cuenta: "" }] 
  }));
  
  const delBco = (i) => setF((prev) => ({ 
    ...prev, 
    bancos: (prev.bancos || []).filter((_, j) => j !== i) 
  }));

  const guardar = () => {
    if (!f.rif || !f.razonSocial || (!f.esProveedor && !f.esCliente)) return;
    
    // Limpiamos los bancos vacíos antes de guardar
    const dataClean = { 
      rif: f.rif, 
      razonSocial: f.razonSocial, 
      bancos: (f.bancos || []).filter((b) => b.banco || b.cuenta), 
      esProveedor: f.esProveedor, 
      esCliente: f.esCliente, 
      id: f.id 
    };
    onSave(dataClean);
  };

  return (
    <Modal title={initialData ? "Editar contacto" : "Agregar contacto"} onClose={onClose}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, background: C.paper, padding: 12, borderRadius: 10, border: `1px solid ${C.line}` }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
          <input 
            type="checkbox" 
            checked={f.esProveedor} 
            onChange={(e) => setF({ ...f, esProveedor: e.target.checked })} 
          /> 
          Es Proveedor
        </label>
        
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5 }}>
          <input 
            type="checkbox" 
            checked={f.esCliente} 
            onChange={(e) => setF({ ...f, esCliente: e.target.checked })} 
          /> 
          Es Cliente
        </label>
      </div>
      
      <Field label="RIF">
        <Input 
          value={f.rif} 
          onChange={(e) => setF({ ...f, rif: e.target.value })} 
          placeholder="J-XXXXXXXX-X" 
        />
      </Field>
      
      <Field label="Razón social">
        <Input 
          value={f.razonSocial} 
          onChange={(e) => setF({ ...f, razonSocial: e.target.value })} 
        />
      </Field>
      
      {/* Cuentas bancarias dinámicas (Solo si es proveedor) */}
      {f.esProveedor && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 6 }}>
            Cuentas bancarias del proveedor
          </div>
          
          {(f.bancos || []).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <Input 
                value={b.banco} 
                onChange={(e) => setBco(i, "banco", e.target.value)} 
                placeholder="Banco" 
                style={{ marginBottom: 0 }} 
              />
              <Input 
                value={b.cuenta} 
                onChange={(e) => setBco(i, "cuenta", e.target.value)} 
                placeholder="N° de cuenta" 
                style={{ marginBottom: 0 }} 
              />
              <Btn small variant="danger" onClick={() => delBco(i)}>
                <X size={13} />
              </Btn>
            </div>
          ))}
          
          <div style={{ marginBottom: 14 }}>
            <Btn small variant="ghost" onClick={addBco}>
              <Plus size={13} /> Agregar banco
            </Btn>
          </div>
        </div>
      )}
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar} disabled={!f.esProveedor && !f.esCliente}>Guardar</Btn>
      </div>
    </Modal>
  );
}