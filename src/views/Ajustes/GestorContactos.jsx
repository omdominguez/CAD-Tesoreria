import React, { useState } from "react";
import { Plus, Trash2, Pencil, Users, X, Globe2, MapPin, Coins } from "lucide-react";

// Tema y Utilidades
import { C } from "../../constants/theme";
import { esProv, esCli, bancosProv, contactosOrdenados } from "../../utils/finance";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Field, Input, Select } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

// Redes cripto más comunes para pagos a proveedores en Venezuela
const REDES_CRIPTO = ["TRC20 (Tron)", "ERC20 (Ethereum)", "BEP20 (BSC)", "Polygon", "Bitcoin", "Solana"];

const CUENTA_VACIA = () => ({
  id: crypto.randomUUID(),
  banco: "",
  cuenta: "",
  moneda: "USD",
  tipo: "NACIONAL", // NACIONAL | INTERNACIONAL | CRIPTO
  pais: "Venezuela",
  swift: "",
  routing: "",
  red: "TRC20 (Tron)",
  walletAddress: ""
});

export default function GestorContactos({ st, act }) {
  // modalData: null = cerrado, { type: 'new' | 'edit', data: obj }
  const [modalData, setModalData] = useState(null);
  const [filtro, setFiltro] = useState("TODOS");

  // Filtrado de la lista según el tab seleccionado
  const lista = contactosOrdenados(st).filter((p) => {
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
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>RIF</Th>
                  <Th>Razón social</Th>
                  <Th>Perfil</Th>
                  <Th>Cuentas bancarias</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const cuentas = bancosProv(p);
                  return (
                    <tr key={p.id}>
                      <Td>{p.rif}</Td>
                      <Td bold>{p.razonSocial}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {esProv(p) && <Badge tone="gold">Prov</Badge>}
                          {esCli(p) && <Badge tone="verde">Cli</Badge>}
                        </div>
                      </Td>
                      <Td>
                        {cuentas.length === 0 ? (
                          <span style={{ fontSize: 12, color: C.mut }}>—</span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {cuentas.map((c, i) => (
                              <Badge key={i} tone={c.tipo === "CRIPTO" ? "gold" : c.tipo === "INTERNACIONAL" ? "azul" : "mut"}>
                                {c.tipo === "CRIPTO" ? <Coins size={10} /> : c.tipo === "INTERNACIONAL" ? <Globe2 size={10} /> : <MapPin size={10} />}
                                {" "}{c.tipo === "CRIPTO" ? (c.moneda || "Cripto") : (c.banco || "Sin nombre")}
                              </Badge>
                            ))}
                          </div>
                        )}
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
                  );
                })}
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
      // A las cuentas viejas que no tengan id/tipo/moneda (de antes de este
      // cambio) les completamos los campos que falten, sin perder sus datos.
      const cuentasExisten = bancosProv(initialData).map((b) => ({ ...CUENTA_VACIA(), ...b }));
      return { 
        ...initialData, 
        bancos: cuentasExisten.length ? cuentasExisten : [CUENTA_VACIA()], 
        esProveedor: esProv(initialData), 
        esCliente: esCli(initialData) 
      };
    }
    return { 
      rif: "", 
      razonSocial: "", 
      bancos: [CUENTA_VACIA()], 
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
    bancos: [...(prev.bancos || []), CUENTA_VACIA()] 
  }));
  
  const delBco = (i) => setF((prev) => ({ 
    ...prev, 
    bancos: (prev.bancos || []).filter((_, j) => j !== i) 
  }));

  const guardar = () => {
    if (!f.rif || !f.razonSocial || (!f.esProveedor && !f.esCliente)) return;
    
    // Limpiamos las cuentas vacías antes de guardar (las que no tienen ni banco ni cuenta)
    const dataClean = { 
      rif: f.rif, 
      razonSocial: f.razonSocial, 
      bancos: (f.bancos || []).filter((b) => b.banco || b.cuenta || b.walletAddress), 
      esProveedor: f.esProveedor, 
      esCliente: f.esCliente, 
      id: f.id 
    };
    onSave(dataClean);
  };

  return (
    <Modal title={initialData ? "Editar contacto" : "Agregar contacto"} wide onClose={onClose}>
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
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
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
      </div>
      
      {/* Cuentas bancarias dinámicas (Solo si es proveedor) */}
      {f.esProveedor && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 8 }}>
            Cuentas bancarias del proveedor
          </div>
          
          <div style={{ display: "grid", gap: 10 }}>
            {(f.bancos || []).map((b, i) => (
              <div key={b.id || i} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, background: C.paper }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <Segmented
                    value={b.tipo}
                    onChange={(v) => setBco(i, "tipo", v)}
                    options={[
                      { id: "NACIONAL", label: "Nacional" },
                      { id: "INTERNACIONAL", label: "Internacional" },
                      { id: "CRIPTO", label: "Cripto" }
                    ]}
                  />
                  <Btn small variant="danger" onClick={() => delBco(i)}>
                    <X size={13} />
                  </Btn>
                </div>

                {b.tipo === "CRIPTO" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <Select value={b.moneda} onChange={(e) => setBco(i, "moneda", e.target.value)} style={{ marginBottom: 0 }}>
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="BNB">BNB</option>
                      </Select>
                      <Select value={b.red} onChange={(e) => setBco(i, "red", e.target.value)} style={{ marginBottom: 0 }}>
                        {REDES_CRIPTO.map((r) => <option key={r} value={r}>{r}</option>)}
                      </Select>
                    </div>
                    <Input
                      value={b.walletAddress}
                      onChange={(e) => setBco(i, "walletAddress", e.target.value)}
                      placeholder="Dirección de la wallet"
                      style={{ marginBottom: 0, fontFamily: "monospace", fontSize: 12.5 }}
                    />
                    <div style={{ fontSize: 11, color: C.mut, marginTop: 6 }}>
                      Verifica siempre la red antes de transferir — enviar por la red equivocada puede perder los fondos de forma irreversible.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                      <Input 
                        value={b.banco} 
                        onChange={(e) => setBco(i, "banco", e.target.value)} 
                        placeholder="Nombre del banco" 
                        style={{ marginBottom: 0 }} 
                      />
                      <Select value={b.moneda} onChange={(e) => setBco(i, "moneda", e.target.value)} style={{ marginBottom: 0 }}>
                        <option value="USD">USD</option>
                        <option value="BS">Bs</option>
                        <option value="EUR">EUR</option>
                      </Select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: b.tipo === "INTERNACIONAL" ? "1fr 1fr" : "1fr", gap: 8, marginBottom: b.tipo === "INTERNACIONAL" ? 8 : 0 }}>
                      <Input 
                        value={b.cuenta} 
                        onChange={(e) => setBco(i, "cuenta", e.target.value)} 
                        placeholder="N° de cuenta / IBAN" 
                        style={{ marginBottom: 0 }} 
                      />
                      {b.tipo === "INTERNACIONAL" && (
                        <Input 
                          value={b.pais} 
                          onChange={(e) => setBco(i, "pais", e.target.value)} 
                          placeholder="País del banco (ej. Estados Unidos)" 
                          style={{ marginBottom: 0 }} 
                        />
                      )}
                    </div>

                    {b.tipo === "INTERNACIONAL" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <Input 
                          value={b.swift} 
                          onChange={(e) => setBco(i, "swift", e.target.value)} 
                          placeholder="Código SWIFT / BIC" 
                          style={{ marginBottom: 0 }} 
                        />
                        <Input 
                          value={b.routing} 
                          onChange={(e) => setBco(i, "routing", e.target.value)} 
                          placeholder="Routing number (ABA)" 
                          style={{ marginBottom: 0 }} 
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <Btn small variant="ghost" onClick={addBco}>
              <Plus size={13} /> Agregar cuenta bancaria
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
