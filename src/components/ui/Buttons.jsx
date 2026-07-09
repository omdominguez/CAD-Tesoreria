import React from "react";
import { C, FONTS, UI } from "../../constants/theme";

export function Btn({ children, onClick, variant = "primary", small, disabled, title }) {
  const base = { 
    border: "1px solid transparent", 
    borderRadius: UI.RADIUS_SM, 
    fontWeight: 600, 
    cursor: disabled ? "not-allowed" : "pointer", 
    opacity: disabled ? 0.4 : 1, 
    fontFamily: FONTS.SANS, 
    display: "inline-flex", 
    alignItems: "center", 
    gap: 6, 
    whiteSpace: "nowrap", 
    transition: "background-color .12s, border-color .12s, opacity .12s",
    letterSpacing: 0.1,
  };
  
  const pad = small 
    ? { padding: "6px 11px", fontSize: 12.5 } 
    : { padding: "9px 15px", fontSize: 13.5 };
    
  const styles = {
    primary: { background: C.ink, color: "#fff" },
    gold: { background: C.gold, color: "#fff" },
    ghost: { background: C.surface, color: C.ink, borderColor: C.line },
    soft: { background: C.greenSoft, color: C.greenDk },
    danger: { background: C.surface, color: C.rojo, borderColor: "var(--rojo-line)" },
  };
  
  return (
    <button 
      className="cad-btn"
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
      background: C.body, 
      border: `1px solid ${C.line}`, 
      borderRadius: UI.RADIUS_SM + 2, 
      padding: 3, 
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
              border: on ? `1px solid ${C.line}` : "1px solid transparent", 
              cursor: "pointer", 
              borderRadius: UI.RADIUS_SM, 
              padding: "7px 13px", 
              fontSize: 13, 
              fontWeight: 600, 
              fontFamily: FONTS.SANS, 
              whiteSpace: "nowrap", 
              background: on ? C.surface : "transparent", 
              color: on ? C.ink : C.mut,
            }}
          >
            {Ic && <Ic size={15} />} {o.label}
          </button>
        );
      })}
    </div>
  );
}
