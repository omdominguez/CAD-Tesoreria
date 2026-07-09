import React, { useState } from "react";

// Tema y utilidades
import { C, CLASIF } from "../../constants/theme";
import { money } from "../../utils/finance";

// Componentes UI
import { Modal } from "../../components/ui/Layout";
import { Field, Input, Select } from "../../components/ui/Forms";
import { Btn } from "../../components/ui/Buttons";
import { AdjuntosInput } from "../../components/shared/Adjuntos";

export default function FormCompromiso({ proveedores, onSave, onClose }) {
  // Estado local y aislado del formulario
  const [f, setF] = useState({ 
    proveedorId: proveedores[0]?.id || "", 
    numeroPedidoOdoo: "", 
    descripcion: "", 
    categoria: CLASIF[0], 
    montoOriginal: "", 
    moneda: "USD", 
    fechaPedido: new Date().toISOString().slice(0, 10), 
    fechaVencimiento: new Date().toISOString().slice(0, 10), 
    prioridad: "NORMAL", 
    enCuotas: false, 
    numCuotas: 2, 
    frecuencia: "MENSUAL", 
    montoInicial: "", 
    antOn: false, 
    adjuntos: [] 
  });

  const guardarNuevo = () => {
    if (!f.proveedorId || !f.montoOriginal) return;
    
    // Lógica para compras financiadas (Múltiples cuotas)
    if (f.enCuotas) {
      let listaCuotas = [];
      const numCuotas = Number(f.numCuotas) || 1;
      const montoInicial = Number(f.montoInicial || 0);
      const montoRestante = Number(f.montoOriginal) - montoInicial;
      const montoPorCuota = montoRestante / numCuotas;
      
      // Si hay pago inicial, lo creamos como un compromiso aparte (y posiblemente ya pagado)
      if (montoInicial > 0) {
        listaCuotas.push({ 
          data: { 
            ...f, 
            descripcion: `${f.descripcion} (Inicial)`, 
            montoOriginal: montoInicial, 
            fechaVencimiento: f.fechaPedido 
          }, 
          anticipo: f.antOn ? { 
            monto: montoInicial, 
            fecha: f.fechaPedido, 
            tipo: "TRANSFERENCIA", 
            bancoOrigenId: null, 
            referencia: "Pago Inicial" 
          } : null 
        });
      }
      
      // Proyección de las cuotas restantes
      let d = new Date(f.fechaVencimiento + "T00:00:00");
      for (let i = 1; i <= numCuotas; i++) {
        listaCuotas.push({ 
          data: { 
            ...f, 
            descripcion: `${f.descripcion} (Cuota ${i}/${numCuotas})`, 
            montoOriginal: montoPorCuota, 
            fechaVencimiento: d.toISOString().slice(0, 10) 
          }, 
          anticipo: null 
        });
        
        // Incrementar la fecha según la frecuencia elegida
        if (f.frecuencia === "MENSUAL") d.setMonth(d.getMonth() + 1); 
        else if (f.frecuencia === "QUINCENAL") d.setDate(d.getDate() + 15); 
        else if (f.frecuencia === "SEMANAL") d.setDate(d.getDate() + 7);
      }
      
      onSave(listaCuotas);
    } else {
      // Compra simple (Un solo pago)
      onSave([{ data: { ...f, montoOriginal: Number(f.montoOriginal) }, anticipo: null }]);
    }
  };

  return (
    <Modal title="Registrar Compra / Financiamiento" wide onClose={onClose}>
      <Field label="Proveedor">
        <Select value={f.proveedorId} onChange={(e) => setF({ ...f, proveedorId: e.target.value })}>
          {proveedores.map((p) => (
            <option key={p.id} value={p.id}>{p.razonSocial}</option>
          ))}
        </Select>
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="N° de pedido Odoo">
          <Input 
            value={f.numeroPedidoOdoo} 
            onChange={(e) => setF({ ...f, numeroPedidoOdoo: e.target.value })} 
            placeholder="Ej. P12986" 
          />
        </Field>
        <Field label="Categoría">
          <Select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
            {CLASIF.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </Field>
        <Field label="Moneda">
          <Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}>
            <option value="USD">USD</option>
            <option value="BS">Bs</option>
          </Select>
        </Field>
      </div>
      
      <Field label="Descripción del bien o servicio">
        <Input 
          value={f.descripcion} 
          onChange={(e) => setF({ ...f, descripcion: e.target.value })} 
          placeholder="Galpón, maquinaria, servicio eléctrico..." 
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monto total a pagar">
          <Input 
            type="number" 
            value={f.montoOriginal} 
            onChange={(e) => setF({ ...f, montoOriginal: e.target.value })} 
          />
        </Field>
        <Field label="Fecha base de la operación">
          <Input 
            type="date" 
            value={f.fechaPedido} 
            onChange={(e) => setF({ ...f, fechaPedido: e.target.value })} 
          />
        </Field>
      </div>
      
      <AdjuntosInput 
        value={f.adjuntos} 
        onChange={(a) => setF({ ...f, adjuntos: a })} 
        label="Orden de compra / cotización (PDF o imagen)" 
      />
      
      <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 4, paddingTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: C.greenDk, cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={f.enCuotas} 
            onChange={(e) => setF({ ...f, enCuotas: e.target.checked })} 
          /> 
          Esta compra fue financiada (múltiples cuotas)
        </label>
        
        {f.enCuotas ? (
          <div style={{ marginTop: 12, padding: 14, background: C.greenSoft, borderRadius: 12, border: `1px solid ${C.green}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Monto inicial (opcional)">
                <Input 
                  type="number" 
                  value={f.montoInicial} 
                  onChange={(e) => setF({ ...f, montoInicial: e.target.value })} 
                  placeholder="Parte pagada de contado" 
                />
              </Field>
              {Number(f.montoInicial) > 0 && (
                <div style={{ paddingTop: 22 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: C.ink, cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={f.antOn} 
                      onChange={(e) => setF({ ...f, antOn: e.target.checked })} 
                    /> 
                    Marcar la inicial como "ya pagada"
                  </label>
                </div>
              )}
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 8 }}>
              <Field label="N° de cuotas (del saldo)">
                <Input 
                  type="number" 
                  value={f.numCuotas} 
                  onChange={(e) => setF({ ...f, numCuotas: e.target.value })} 
                />
              </Field>
              <Field label="Frecuencia">
                <Select value={f.frecuencia} onChange={(e) => setF({ ...f, frecuencia: e.target.value })}>
                  <option value="MENSUAL">Mensual</option>
                  <option value="QUINCENAL">Quincenal</option>
                  <option value="SEMANAL">Semanal</option>
                </Select>
              </Field>
              <Field label="Vence 1ra cuota el">
                <Input 
                  type="date" 
                  value={f.fechaVencimiento} 
                  onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} 
                />
              </Field>
            </div>
            
            <div style={{ fontSize: 12, color: C.greenDk, marginTop: 4, fontWeight: 600 }}>
              El sistema proyectará {f.numCuotas || 0} cuotas de aprox. {money((Number(f.montoOriginal) - Number(f.montoInicial || 0)) / (Number(f.numCuotas) || 1), f.moneda)}.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Field label="Fecha límite de pago">
              <Input 
                type="date" 
                value={f.fechaVencimiento} 
                onChange={(e) => setF({ ...f, fechaVencimiento: e.target.value })} 
              />
            </Field>
          </div>
        )}
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardarNuevo} disabled={!f.proveedorId || !f.montoOriginal}>Generar deuda</Btn>
      </div>
    </Modal>
  );
}