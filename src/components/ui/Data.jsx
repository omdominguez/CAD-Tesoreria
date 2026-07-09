import React from "react";
import { C, FONTS } from "../../constants/theme";
import { money } from "../../utils/finance";
import { Card } from "./Layout";

export function Badge({ tone, children }) {
  // Mapa de colores [Color de texto, Color de fondo]
  const map = { 
    verde: [C.verde, C.verdeSoft], 
    amar: [C.amar, C.amarSoft], 
    rojo: [C.rojo, C.rojoSoft], 
    green: [C.greenDk, C.greenSoft], 
    gold: [C.gold, C.goldSoft], 
    mut: [C.mut, "var(--mut-soft)"], 
    azul: [C.azul, C.azulSoft] 
  };
  
  const [fg, bg] = map[tone] || map.mut;
  
  return (
    <span style={{ 
      color: fg, 
      background: bg, 
      fontSize: 11, 
      fontWeight: 700, 
      padding: "3px 9px", 
      borderRadius: 999, 
      letterSpacing: 0.2, 
      whiteSpace: "nowrap" 
    }}>
      {children}
    </span>
  );
}

export function KpiCard({ t, v, ic: Ic, tone, sub }) {
  return (
    <Card style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ 
          fontSize: 11.5, 
          fontWeight: 700, 
          color: C.mut, 
          textTransform: "uppercase", 
          letterSpacing: 0.4 
        }}>
          {t}
        </div>
        <div style={{ 
          width: 30, 
          height: 30, 
          borderRadius: 8, 
          background: C.body, 
          display: "inline-flex", 
          alignItems: "center", 
          justifyContent: "center", 
          color: tone 
        }}>
          <Ic size={16} />
        </div>
      </div>
      
      <div style={{ 
        fontFamily: FONTS.SANS, 
        fontSize: 27, 
        fontWeight: 800, 
        color: C.ink, 
        marginTop: 10, 
        letterSpacing: -0.5,
        fontVariantNumeric: "tabular-nums" 
      }}>
        {money(v, "USD")}
      </div>
      
      <div style={{ fontSize: 11.5, color: C.mut, marginTop: 4 }}>
        {sub}
      </div>
    </Card>
  );
}