import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Landmark } from "lucide-react";
import { Btn, Card, Field, Input, Modal, Select } from '../../components/ui';
import { money } from '../../utils/finance';
import { C } from '../../constants/theme';

export default function Bancos({ st, act }) {
  const [modal, setModal] = useState(null);
  
  // Aquí delegamos el formulario
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h2>Cuentas Bancarias</h2>
        <Btn onClick={() => setModal({ type: "new", data: null })}><Plus size={15} /> Agregar banco</Btn>
      </div>

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
             {/* Headers... */}
          </thead>
          <tbody>
            {(st.bancos || []).map((b) => (
              <tr key={b.id}>
                <td>{b.nombre}</td>
                <td>{money(b.saldoActual, b.moneda)}</td>
                <td>
                  <Btn small variant="ghost" onClick={() => setModal({ type: "edit", data: b })}><Pencil size={13} /></Btn>
                  <Btn small variant="danger" onClick={() => act.delBanco(b.id)}><Trash2 size={13} /></Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {modal && (
        <BancoModal 
          initialData={modal.data} 
          onClose={() => setModal(null)} 
          onSave={(data) => {
            modal.type === "edit" ? act.updBanco(data) : act.addBanco(data);
            setModal(null);
          }} 
        />
      )}
    </div>
  );
}

// ✅ EL ESTADO DEL FORMULARIO QUEDA AISLADO AQUÍ
function BancoModal({ initialData, onClose, onSave }) {
  const [f, setF] = useState(initialData || { nombre: "", numeroCuenta: "", tipoCuenta: "Corriente", moneda: "BS", saldoInicial: "", saldoActual: "" });

  const guardar = () => {
    if (!f.nombre) return;
    onSave({ ...f, saldoInicial: Number(f.saldoInicial || 0), saldoActual: Number(f.saldoActual || f.saldoInicial || 0) });
  };

  return (
    <Modal title={initialData ? "Editar banco" : "Agregar banco"} onClose={onClose}>
      <Field label="Nombre del banco"><Input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Field>
      <div style={{ display: "flex", gap: 12 }}>
         <Field label="Saldo"><Input type="number" value={f.saldoActual} onChange={(e) => setF({ ...f, saldoActual: e.target.value })} /></Field>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
         <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
         <Btn onClick={guardar}>Guardar</Btn>
      </div>
    </Modal>
  );
}