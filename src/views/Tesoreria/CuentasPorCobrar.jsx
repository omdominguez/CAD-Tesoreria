import React, { useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";

// Tema y utilidades
import { C } from "../../constants/theme";
import { 
  esCli, 
  estadoCxC, 
  provNom, 
  fmtD, 
  money, 
  cobradoDeCxC, 
  pendienteCxC 
} from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Field, Input, Select } from "../../components/ui/Forms";
import { Badge } from "../../components/ui/Data";

export default function CuentasPorCobrar({ st, act, rol }) {
  // modalOpen: controla el despliegue del modal aislado
  const [modalOpen, setModalOpen] = useState(false);
  const [filtro, setFiltro] = useState("TODOS");

  const puedeCrear = rol === "MASTER" || rol === "TESORERIA";
  const clientes = (st.proveedores || []).filter(esCli);

  // Lógica de filtrado y ordenamiento cronológico por fecha de vencimiento
  const pasa = (c) => { 
    const e = estadoCxC(st, c); 
    return filtro === "TODOS" ? e !== "ANULADO" : e === filtro; 
  };
  
  const lista = (st.cuentasCobrar || [])
    .filter((c) => !c.anulado && pasa(c))
    .sort((a, b) => (a.fechaVencimiento || "").localeCompare(b.fechaVencimiento || ""));
    
  const pg = usePaged(lista, 10);

  return (
    <Section 
      title="Cuentas por Cobrar (Ventas)" 
      desc="Registra facturas emitidas a clientes. Se cobran en la pestaña de Cobranzas." 
      action={
        puedeCrear && (
          <Btn onClick={() => setModalOpen(true)} disabled={clientes.length === 0}>
            <Plus size={15} /> Nueva factura
          </Btn>
        )
      }
    >
      <div style={{ marginBottom: 12 }}>
        <Segmented 
          value={filtro} 
          onChange={setFiltro} 
          options={["TODOS", "PENDIENTE", "PARCIAL", "COBRADO"].map((x) => ({ 
            id: x, 
            label: x[0] + x.slice(1).toLowerCase() 
          }))} 
        />
      </div>

      {lista.length === 0 ? (
        <Empty 
          icon={Receipt} 
          title="Sin facturas" 
          msg="Registra facturas para controlar la deuda de clientes." 
          action={
            puedeCrear && clientes.length > 0 && (
              <Btn onClick={() => setModalOpen(true)}>
                <Plus size={15} /> Nueva factura
              </Btn>
            )
          } 
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Cliente / concepto</Th>
                  <Th>Factura</Th>
                  <Th>Vence</Th>
                  <Th right>Total</Th>
                  <Th right>Cobrado</Th>
                  <Th right>Pendiente</Th>
                  <Th>Estado</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((c) => {
                  // Si ya tiene cobros parciales o totales, protegemos el botón de eliminar
                  const isProtected = cobradoDeCxC(st, c.id) > 0;
                  const estado = estadoCxC(st, c);
                  const toneBadge = estado === "COBRADO" ? "verde" : estado === "PARCIAL" ? "amar" : "gold";
                  
                  return (
                    <tr key={c.id}>
                      <Td>
                        <div style={{ fontWeight: 700 }}>{provNom(st, c.clienteId)}</div>
                        <div style={{ fontSize: 11.5, color: C.mut }}>{c.descripcion || "—"}</div>
                      </Td>
                      <Td>{c.numeroFactura || <span style={{ color: C.mut }}>—</span>}</Td>
                      <Td>{fmtD(c.fechaVencimiento)}</Td>
                      <Td right>{money(c.montoOriginal, c.moneda)}</Td>
                      <Td right>
                        {cobradoDeCxC(st, c.id) > 0 ? (
                          <span style={{ color: C.verde }}>{money(cobradoDeCxC(st, c.id), c.moneda)}</span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td right bold>{money(pendienteCxC(st, c), c.moneda)}</Td>
                      <Td><Badge tone={toneBadge}>{estado}</Badge></Td>
                      <Td right>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {puedeCrear && (
                            <Btn 
                              small 
                              variant="danger" 
                              disabled={isProtected} 
                              onClick={() => act.delCxC(c.id)}
                            >
                              <Trash2 size={13} />
                            </Btn>
                          )}
                        </div>
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

      {/* Renderizado Condicional del Formulario Aislado */}
      {modalOpen && (
        <FacturaModal 
          clientes={clientes}
          onClose={() => setModalOpen(false)}
          onSave={(data) => {
            act.addCxC(data);
            setModalOpen(false);
          }}
        />
      )}
    </Section>
  );
}


/* ============================================================
   COMPONENTE AISLADO: FORMULARIO DE FACTURA (CxC)
   Esto aísla por completo la entrada de texto evitando lag en la UI
   ============================================================ */
function FacturaModal({ clientes, onClose, onSave }) {
  const [f, setF] = useState({ 
    clienteId: clientes[0]?.id || "", 
    numeroFactura: "", 
    descripcion: "", 
    montoOriginal: "", 
    moneda: "USD", 
    fechaEmision: new Date().toISOString().slice(0, 10), 
    fechaVencimiento: new Date().toISOString().slice(0, 10) 
  });

  const guardar = () => {
    if (!f.clienteId || !f.montoOriginal) return;
    onSave({ ...f, montoOriginal: Number(f.montoOriginal) });
  };

  return (
    <Modal title="Registrar Factura (CxC)" wide onClose={onClose}>
      <Field label="Cliente">
        <Select value={f.clienteId} onChange={(e) => setF({ ...f, clienteId: e.target.value })}>
          {clientes.map((p) => (
            <option key={p.id} value={p.id}>{p.razonSocial}</option>
          ))}
        </Select>
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="N° de Factura">
          <Input 
            value={f.numeroFactura} 
            onChange={(e) => setF({ ...f, numeroFactura: e.target.value })} 
          />
        </Field>
        <Field label="Fecha emisión">
          <Input 
            type="date" 
            value={f.fechaEmision} 
            onChange={(e) => setF({ ...f, fechaEmision: e.target.value })} 
          />
        </Field>
        <Field label="Fecha vencimiento">
          <Input 
            type="date" 
            value={f.fechaVencimiento} 
            onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} 
          />
        </Field>
      </div>
      
      <Field label="Descripción / Concepto">
        <Input 
          value={f.descripcion} 
          onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monto total">
          <Input 
            type="number" 
            value={f.montoOriginal} 
            onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} 
          />
        </Field>
        <Field label="Moneda">
          <Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}>
            <option value="BS">Bs</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar}>Registrar factura</Btn>
      </div>
    </Modal>
  );
}