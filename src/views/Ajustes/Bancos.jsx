import React, { useState } from "react";
import { Plus, Trash2, Pencil, Landmark } from "lucide-react";

// Lógica y Tema
import { money } from "../../utils/finance";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Field, Input, Select } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

export default function Bancos({ st, act }) {
  // Manejaremos el estado del modal con un objeto para saber si estamos editando o creando
  const [modalData, setModalData] = useState(null); // null = cerrado, { type: 'new' | 'edit', data: obj }

  const bancos = st.bancos || [];

  return (
    <Section 
      title="Cuentas Bancarias" 
      desc="Registra tus cuentas. Tesorería las usará para emitir pagos o recibir cobranzas." 
      action={
        <Btn onClick={() => setModalData({ type: "new", data: null })}>
          <Plus size={15} /> Agregar banco
        </Btn>
      }
    >
      {bancos.length === 0 ? (
        <Empty 
          icon={Landmark} 
          title="Sin cuentas registradas" 
          msg="Agrega bancos para proyectar la caja." 
          action={
            <Btn onClick={() => setModalData({ type: "new", data: null })}>
              <Plus size={15} /> Agregar banco
            </Btn>
          } 
        />
      ) : (
        <Card>
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Banco</Th>
                  <Th>Cuenta</Th>
                  <Th>Tipo</Th>
                  <Th>Moneda</Th>
                  <Th right>Saldo actual</Th>
                  <Th right>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {bancos.map((b) => (
                  <tr key={b.id}>
                    <Td bold>{b.nombre}</Td>
                    <Td>{b.numeroCuenta || "—"}</Td>
                    <Td>{b.tipoCuenta}</Td>
                    <Td><Badge tone="mut">{b.moneda}</Badge></Td>
                    <Td right bold>{money(b.saldoActual, b.moneda)}</Td>
                    <Td right>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <Btn small variant="ghost" onClick={() => setModalData({ type: "edit", data: b })}>
                          <Pencil size={13} />
                        </Btn>
                        <Btn small variant="danger" onClick={() => act.delBanco(b.id)}>
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
        <BancoModal 
          initialData={modalData.data} 
          onClose={() => setModalData(null)}
          onSave={(data) => {
            modalData.type === "edit" ? act.updBanco(data) : act.addBanco(data);
            setModalData(null);
          }}
        />
      )}
    </Section>
  );
}


/* ============================================================
   COMPONENTE AISLADO: FORMULARIO DE BANCO
   Esto evita que la tabla principal sufra re-renderizados (lag)
   al escribir en los inputs.
   ============================================================ */
function BancoModal({ initialData, onClose, onSave }) {
  const [f, setF] = useState(initialData || { 
    nombre: "", 
    numeroCuenta: "", 
    tipoCuenta: "Corriente", 
    moneda: "BS", 
    saldoInicial: "", 
    saldoActual: "" 
  });

  const guardar = () => {
    if (!f.nombre) return;
    onSave({ 
      ...f, 
      saldoInicial: Number(f.saldoInicial || 0), 
      saldoActual: Number(f.saldoActual || f.saldoInicial || 0) 
    });
  };

  return (
    <Modal title={initialData ? "Editar banco" : "Agregar banco"} onClose={onClose}>
      <Field label="Nombre del banco">
        <Input 
          value={f.nombre} 
          onChange={(e) => setF({ ...f, nombre: e.target.value })} 
          placeholder="Banesco, Mercantil..." 
        />
      </Field>
      
      <Field label="Número de cuenta">
        <Input 
          value={f.numeroCuenta} 
          onChange={(e) => setF({ ...f, numeroCuenta: e.target.value })} 
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de cuenta">
          <Select value={f.tipoCuenta} onChange={(e) => setF({ ...f, tipoCuenta: e.target.value })}>
            <option>Corriente</option>
            <option>Ahorro</option>
            <option>Custodia</option>
          </Select>
        </Field>
        
        <Field label="Moneda">
          <Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}>
            <option value="BS">Bs</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
        </Field>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Saldo inicial">
          <Input 
            type="number" 
            value={f.saldoInicial} 
            onChange={(e) => setF({ ...f, saldoInicial: e.target.value })} 
          />
        </Field>
        
        <Field label="Saldo actual">
          <Input 
            type="number" 
            value={f.saldoActual} 
            onChange={(e) => setF({ ...f, saldoActual: e.target.value })} 
          />
        </Field>
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar}>Guardar</Btn>
      </div>
    </Modal>
  );
}