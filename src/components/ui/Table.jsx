import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, FONTS } from "../../constants/theme";

// Importamos el Select base para mantener la consistencia en el selector de "items por página"
import { Select } from "./Forms";

export function Th({ children, right }) { 
  return (
    <th style={{ 
      textAlign: right ? "right" : "left", 
      fontSize: 11, 
      color: C.mut, 
      fontWeight: 700, 
      padding: "11px 14px", 
      borderBottom: `1px solid ${C.line}`, 
      letterSpacing: 0.4, 
      textTransform: "uppercase", 
      background: C.body, 
      position: "sticky", 
      top: 0 
    }}>
      {children}
    </th>
  ); 
}

export function Td({ children, right, bold }) { 
  return (
    <td style={{ 
      textAlign: right ? "right" : "left", 
      fontSize: 13, 
      padding: "11px 14px", 
      borderBottom: `1px solid ${C.line}`, 
      color: C.ink, 
      fontWeight: bold ? 700 : 400, 
      fontVariantNumeric: "tabular-nums" 
    }}>
      {children}
    </td>
  ); 
}

// Estilo auxiliar para los botones de la paginación
const pgBtn = (dis) => ({ 
  width: 30, 
  height: 30, 
  borderRadius: 8, 
  border: `1px solid ${C.line}`, 
  background: C.surface, 
  color: dis ? C.mut2 : C.ink, 
  cursor: dis ? "not-allowed" : "pointer", 
  display: "inline-flex", 
  alignItems: "center", 
  justifyContent: "center",
  padding: 0
});

export function Pagination({ pg }) {
  if (pg.total === 0) return null;
  
  const from = (pg.page - 1) * pg.perPage + 1;
  const to = Math.min(pg.total, pg.page * pg.perPage);
  
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      flexWrap: "wrap", 
      gap: 10, 
      padding: "12px 14px", 
      borderTop: `1px solid ${C.line}` 
    }}>
      <div style={{ fontSize: 12.5, color: C.mut }}>
        Mostrando <b style={{ color: C.ink }}>{from}–{to}</b> de {pg.total}
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Select 
          value={pg.perPage} 
          onChange={(e) => { 
            pg.setPerPage(Number(e.target.value)); 
            pg.setPage(1); 
          }} 
          style={{ width: "auto", padding: "6px 8px", fontSize: 12.5 }}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>{n} / pág.</option>
          ))}
        </Select>
        
        <div style={{ display: "flex", gap: 4 }}>
          <button 
            onClick={() => pg.setPage(Math.max(1, pg.page - 1))} 
            disabled={pg.page <= 1} 
            style={pgBtn(pg.page <= 1)}
          >
            <ChevronLeft size={16} />
          </button>
          
          <span style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            padding: "0 10px", 
            fontSize: 13, 
            fontWeight: 600, 
            color: C.ink 
          }}>
            {pg.page} / {pg.pages}
          </span>
          
          <button 
            onClick={() => pg.setPage(Math.min(pg.pages, pg.page + 1))} 
            disabled={pg.page >= pg.pages} 
            style={pgBtn(pg.page >= pg.pages)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}