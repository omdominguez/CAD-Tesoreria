import React from "react";

// Tema y finanzas
import { C, FONTS } from "../../constants/theme";
import { nf } from "../../utils/finance";

// Componentes UI
import { Section, Card } from "../../components/ui/Layout";

export default function AjustesTasas({ st, act }) {
  // Definición de las tasas que queremos manejar y sus colores asociados
  const rates = [
    { k: "tasaBCV", lbl: "BCV (oficial)", tone: C.green }, 
    { k: "tasaIntervencion", lbl: "Intervención", tone: C.gold }, 
    { k: "tasaParalelo", lbl: "Mercado paralelo", tone: C.rojo }
  ];

  return (
    <Section 
      title="Tasas de Cambio" 
      desc="Ajusta las tasas del día. Esto revaloriza en tiempo real la deuda en bolívares y sus equivalentes en dólares."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {rates.map((r) => (
          <Card key={r.k} style={{ padding: 18, borderTop: `4px solid ${r.tone}` }}>
            <div style={{ 
              fontSize: 12, 
              color: C.mut, 
              fontWeight: 700, 
              marginBottom: 8, 
              letterSpacing: 0.2 
            }}>
              {r.lbl}
            </div>
            
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 15, color: C.mut, fontWeight: 600 }}>Bs</span>
              <input 
                type="number" 
                value={st.config[r.k] ?? ""} 
                onChange={(e) => act.setRate(r.k, e.target.value)}
                style={{ 
                  width: "100%", 
                  border: "none", 
                  borderBottom: `2px solid ${C.line}`, 
                  fontFamily: FONTS.SERIF, 
                  fontSize: 30, 
                  fontWeight: 700, 
                  color: r.tone, 
                  background: "transparent", 
                  padding: "2px 0", 
                  outline: "none", 
                  fontVariantNumeric: "tabular-nums" 
                }} 
              />
            </div>
            
            <div style={{ fontSize: 11.5, color: C.mut, marginTop: 8 }}>
              1 USD = {nf.format(Number(st.config[r.k]) || 0)} Bs
            </div>
          </Card>
        ))}
      </div>
    </Section>
  );
}