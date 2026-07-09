import React from "react";
import { C, FONTS, UI } from "../../constants/theme";

export function Btn({ children, onClick, variant = "primary", small, disabled, title }) {
  const base = { 
    border: "1px solid transparent", 
    borderRadius: 10, 
    fontWeight: 600, 
    cursor: disabled ? "not-allowed" : "pointer", 
    opacity: disabled ? 0.45 : 1, 
    fontFamily: FONTS.SANS, 
    display: "inline-flex", 
    alignItems: "center", 
    gap: 6, 
    whiteSpace: "nowrap", 
    transition: "transform .05s" 
  };
  
  const pad = small 
    ? { padding: "6px 11px", fontSize: 12.5 } 
    : { padding: "9px 15px", fontSize: 13.5 };
    
  const styles = {
    primary: { background: C.green, color: "#fff", boxShadow: "0 1px 2px rgba(27,94,32,.35)" },
    gold: { background: C.gold, color: "#fff", boxShadow: "0 1px 2px rgba(184,134,11,.35)" },
    ghost: { background: "#fff", color: C.ink, borderColor: C.line },
    soft: { background: C.greenSoft, color: C.greenDk },
    danger: { background: "#fff", color: C.rojo, borderColor: "#EBC7C1" },
  };
  
  return (
    <button 
      title={title} 
      disabled={disabled} 
      onClick={onClick} 
      style={{ ...base, ...pad, ...styles[variant] }}
    >
      {children}
    </button>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div style={{ 
      display: "inline-flex", 
      background: "#ECEFEA", 
      border: `1px solid ${C.line}`, 
      borderRadius: 12, 
      padding: 4, 
      gap: 2, 
      flexWrap: "wrap" 
    }}>
      {options.map((o) => {
        const on = value === o.id; 
        const Ic = o.icon;
        
        return (
          <button 
            key={o.id} 
            onClick={() => onChange(o.id)} 
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 7, 
              border: "none", 
              cursor: "pointer", 
              borderRadius: 9, 
              padding: "8px 14px", 
              fontSize: 13, 
              fontWeight: 600, 
              fontFamily: FONTS.SANS, 
              whiteSpace: "nowrap", 
              background: on ? "#fff" : "transparent", 
              color: on ? C.greenDk : C.mut, 
              boxShadow: on ? UI.SHADOW_SM : "none" 
            }}
          >
            {Ic && <Ic size={15} />} {o.label}
          </button>
        );
      })}
    </div>
  );
}