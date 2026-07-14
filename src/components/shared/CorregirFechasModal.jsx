import React, { useState } from "react";
import { C } from "../../constants/theme";
import { Modal } from "../ui/Layout";
import { Btn } from "../ui/Buttons";

/* ============================================================
   CORREGIR FECHAS DE UN FINANCIAMIENTO
   ------------------------------------------------------------
   Reasigna las fechas de vencimiento de las "Cuota X/Y" de un mismo
   grupo, en orden, empezando en la fecha elegida y con la frecuencia
   indicada. Los pagos iniciales no se tocan. Se usa tanto en Compras
   como en Cuentas por Pagar (Tesorería).
   ============================================================ */
export function CorregirFechasModal({ onClose, onSave }) {
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
  const [frecuencia, setFrecuencia] = useState("MENSUAL");

  return (
    <Modal title="Corregir fechas de las cuotas" onClose={onClose}>
      <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 14 }}>
        Esto reordena las fechas de vencimiento de las cuotas de este financiamiento (no toca los pagos iniciales), empezando en la fecha que elijas y espaciadas según la frecuencia.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.mut, display: "block", marginBottom: 6 }}>Vence la 1ra cuota el</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13.5, background: C.surface, color: C.ink }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: C.mut, display: "block", marginBottom: 6 }}>Frecuencia</label>
          <select
            value={frecuencia}
            onChange={(e) => setFrecuencia(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 13.5, background: C.surface, color: C.ink }}
          >
            <option value="MENSUAL">Mensual</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="SEMANAL">Semanal</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => onSave(fechaInicio, frecuencia)}>Corregir fechas</Btn>
      </div>
    </Modal>
  );
}
