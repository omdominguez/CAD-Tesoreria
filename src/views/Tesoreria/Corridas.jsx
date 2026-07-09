import React, { useState } from "react";
import { Layers, ShieldCheck, Check } from "lucide-react";

// Tema y Utilidades
import { C, FONTS } from "../../constants/theme";
import { activo, provNom, fmtD, money, pendienteDe } from "../../utils/finance";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

// Constantes locales para los estados de la corrida
const estadoTone = { 
  PENDIENTE_AUTORIZACION: "amar", 
  AUTORIZADA: "green", 
  EJECUTADA: "verde", 
  RECHAZADA: "rojo" 
};

const estadoLbl = { 
  PENDIENTE_AUTORIZACION: "Pendiente por autorizar", 
  AUTORIZADA: "Autorizada", 
  EJECUTADA: "Ejecutada", 
  RECHAZADA: "Rechazada" 
};

export default function Corridas({ st, act, rol }) {
  const [sel, setSel] = useState([]); // IDs de compromisos seleccionados
  const [ver, setVer] = useState(null); // ID de la corrida seleccionada para ver detalle

  const puedeAprob = rol === "MASTER";
  
  // Filtrar solo los compromisos en Bs que estén activos y no pertenezcan a ninguna corrida
  const candidatos = (st.compromisos || []).filter(
    (c) => activo(st, c) && !c.corridaId && c.moneda === "BS"
  );

  const toggle = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  
  const crear = () => { 
    if (sel.length) { 
      act.crearCorrida(sel, rol); 
      setSel([]); 
    } 
  };

  const corridaSeleccionada = ver ? (st.corridas || []).find((c) => c.id === ver) : null;
  
  // Utilidad para obtener los compromisos de una corrida en la lista principal
  const compsDe = (co) => (st.compromisos || []).filter((c) => co.compromisoIds.includes(c.id));

  return (
    <Section 
      title="Corridas de pago" 
      desc="Agrupa compromisos en Bs en un lote y envíalo a autorización de gerencia."
    >
      {/* CREADOR DE NUEVA CORRIDA */}
      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: C.greenDk }}>
            Armar nueva corrida (compromisos en Bs)
          </div>
          <Btn onClick={crear} disabled={!sel.length}>
            <Layers size={15} /> Crear corrida ({sel.length})
          </Btn>
        </div>
        
        {candidatos.length === 0 ? (
          <div style={{ fontSize: 13, color: C.mut, padding: "8px 0" }}>
            No hay compromisos en Bs disponibles.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {candidatos.map((c) => (
              <label 
                key={c.id} 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 10, 
                  padding: "9px 11px", 
                  border: `1px solid ${sel.includes(c.id) ? C.green : C.line}`, 
                  borderRadius: 10, 
                  cursor: "pointer", 
                  background: sel.includes(c.id) ? C.greenSoft : "#fff" 
                }}
              >
                <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
                <span style={{ flex: 1, fontSize: 13 }}>
                  <b>{provNom(st, c.proveedorId)}</b> · vence {fmtD(c.fechaVencimiento)}
                </span>
                <span style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                  {money(pendienteDe(st, c), "BS")}
                </span>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* HISTORIAL DE CORRIDAS */}
      {(st.corridas || []).length === 0 ? (
        <Empty icon={Layers} title="Sin corridas" msg="Crea tu primera corrida de pago." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {[...(st.corridas || [])].reverse().map((co) => {
            const total = compsDe(co).reduce((a, c) => a + pendienteDe(st, c), 0);
            return (
              <Card key={co.id} style={{ padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: FONTS.SERIF, fontWeight: 700, fontSize: 16, color: C.ink }}>
                        {co.codigo}
                      </span>
                      <Badge tone={estadoTone[co.estado]}>{estadoLbl[co.estado]}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: C.mut, marginTop: 3 }}>
                      {co.compromisoIds.length} compromisos · creada {fmtD(co.fechaCreacion)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: FONTS.SERIF, fontSize: 19, fontWeight: 700, color: C.ink }}>
                      {money(total, "BS")}
                    </span>
                    <Btn small variant="ghost" onClick={() => setVer(co.id)}>Ver detalle</Btn>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL AISLADO PARA VER EL DETALLE DE LA CORRIDA */}
      {corridaSeleccionada && (
        <CorridaModal 
          st={st}
          corrida={corridaSeleccionada}
          act={act}
          rol={rol}
          puedeAprob={puedeAprob}
          onClose={() => setVer(null)}
        />
      )}
    </Section>
  );
}

/* ============================================================
   SUB-COMPONENTE AISLADO: DETALLE DE CORRIDA
   ============================================================ */
function CorridaModal({ st, corrida, act, rol, puedeAprob, onClose }) {
  const compromisos = (st.compromisos || []).filter((c) => corrida.compromisoIds.includes(c.id));
  const total = compromisos.reduce((a, c) => a + pendienteDe(st, c), 0);

  return (
    <Modal title={`Corrida ${corrida.codigo}`} wide onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Badge tone={estadoTone[corrida.estado]}>{estadoLbl[corrida.estado]}</Badge>
        <div style={{ fontFamily: FONTS.SERIF, fontSize: 20, fontWeight: 700 }}>
          {money(total, "BS")}
        </div>
      </div>
      
      <div style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <Th>Proveedor</Th>
              <Th>Concepto</Th>
              <Th>Vence</Th>
              <Th right>Monto</Th>
            </tr>
          </thead>
          <tbody>
            {compromisos.map((c) => (
              <tr key={c.id}>
                <Td bold>{provNom(st, c.proveedorId)}</Td>
                <Td>{c.descripcion}</Td>
                <Td>{fmtD(c.fechaVencimiento)}</Td>
                <Td right>{money(pendienteDe(st, c), "BS")}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Botones de Acción (según el estado de la corrida y el rol) */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {corrida.estado === "PENDIENTE_AUTORIZACION" && puedeAprob && (
          <>
            <Btn variant="danger" onClick={() => { act.rechazarCorrida(corrida.id); onClose(); }}>
              Rechazar
            </Btn>
            <Btn variant="gold" onClick={() => { act.aprobarCorrida(corrida.id, rol); onClose(); }}>
              <ShieldCheck size={15} /> Aprobar corrida
            </Btn>
          </>
        )}
        
        {corrida.estado === "AUTORIZADA" && (
          <Btn onClick={() => { act.ejecutarCorrida(corrida.id); onClose(); }}>
            <Check size={15} /> Marcar transferencias ejecutadas
          </Btn>
        )}
      </div>
    </Modal>
  );
}