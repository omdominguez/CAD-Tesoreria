import React from "react";
import { C, FONTS } from "../../constants/theme";

// Estilo base compartido para Inputs y Selects
const inputStyle = { 
  width: "100%", 
  padding: "9px 11px", 
  border: `1px solid ${C.line}`, 
  borderRadius: 8, 
  fontSize: 13.5, 
  fontFamily: FONTS.SANS, 
  color: C.ink, 
  background: C.surface, 
  boxSizing: "border-box" 
};

export function Input(props) { 
  return (
    <input 
      {...props} 
      style={{ ...inputStyle, ...(props.style || {}) }} 
    />
  ); 
}

export function Select({ children, ...props }) { 
  return (
    <select 
      {...props} 
      style={{ ...inputStyle, ...(props.style || {}) }}
    >
      {children}
    </select>
  ); 
}

export function Field({ label, children, hint }) {
  return (
    <label style={{ display: "block", marginBottom: 13 }}>
      <div style={{ 
        fontSize: 12, 
        fontWeight: 700, 
        color: C.mut, 
        marginBottom: 5, 
        letterSpacing: 0.2 
      }}>
        {label}
      </div>
      
      {children}
      
      {hint && (
        <div style={{ fontSize: 11, color: C.mut, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </label>
  );
}