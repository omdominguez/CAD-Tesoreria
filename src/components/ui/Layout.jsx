import React from "react";
import { X } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";

/* ============================================================
   COMPONENTES DE UI BÁSICOS
   ============================================================ */

export function Card({ children, style }) { 
  return (
    <div style={{ 
      background: "#fff", 
      border: `1px solid ${C.line}`, 
      borderRadius: UI.RADIUS, 
      boxShadow: UI.SHADOW, 
      ...style 
    }}>
      {children}
    </div>
  ); 
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div 
      onClick={onClose} 
      style={{ 
        position: "fixed", 
        inset: 0, 
        background: "rgba(15,30,16,0.5)", 
        backdropFilter: "blur(2px)", 
        display: "flex", 
        alignItems: "flex-start", 
        justifyContent: "center", 
        padding: "5vh 16px", 
        zIndex: 50, 
        overflowY: "auto" 
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: "#fff", 
          borderRadius: 18, 
          width: "100%", 
          maxWidth: wide ? 900 : 480, 
          boxShadow: "0 24px 70px rgba(0,0,0,0.3)" 
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "16px 22px", 
          borderBottom: `1px solid ${C.line}` 
        }}>
          <div style={{ fontFamily: FONTS.SERIF, fontSize: 19, fontWeight: 700, color: C.greenDk }}>
            {title}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: C.paper, 
              border: `1px solid ${C.line}`, 
              width: 32, 
              height: 32, 
              borderRadius: 9, 
              cursor: "pointer", 
              color: C.mut, 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 22, maxHeight: "80vh", overflowY: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, msg, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ 
        width: 56, 
        height: 56, 
        borderRadius: 16, 
        background: C.greenSoft, 
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center", 
        color: C.green 
      }}>
        <Icon size={27} />
      </div>
      <div style={{ fontFamily: FONTS.SERIF, fontSize: 18, fontWeight: 700, color: C.ink, marginTop: 14 }}>
        {title}
      </div>
      <div style={{ color: C.mut, fontSize: 13.5, marginTop: 6, maxWidth: 420, marginInline: "auto" }}>
        {msg}
      </div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Section({ title, desc, action, children }) {
  return (
    <div>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        flexWrap: "wrap", 
        gap: 10, 
        marginBottom: 18 
      }}>
        <div>
          <h2 style={{ fontFamily: FONTS.SERIF, fontSize: 25, fontWeight: 700, color: C.greenDk, margin: 0 }}>
            {title}
          </h2>
          {desc && (
            <p style={{ color: C.mut, fontSize: 13.5, margin: "5px 0 0", maxWidth: 680 }}>
              {desc}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   COMPONENTES DE ESTRUCTURA (WORKSPACE / SHELL)
   ============================================================ */

export function AppShell({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: C.body || "#F7F9F8", overflow: "hidden" }}>
      {children}
    </div>
  );
}

export function Sidebar({ open, children }) {
  return (
    <div style={{ 
      width: open ? 260 : 0, 
      transition: "width 0.3s ease", 
      backgroundColor: "#fff", 
      borderRight: `1px solid ${C.line}`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
      whiteSpace: "nowrap",
      flexShrink: 0
    }}>
      {children}
    </div>
  );
}

export function SidebarItem({ act, onClick, children, style }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        width: "100%",
        borderRadius: UI.RADIUS,
        border: "none",
        backgroundColor: act ? C.greenSoft : "transparent",
        color: act ? C.greenDk : C.mut,
        fontWeight: act ? 600 : 500,
        fontSize: 14,
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.2s",
        ...style
      }}
    >
      {children}
    </button>
  );
}

export function MainContent({ children }) {
  return (
    <div style={{ 
      flex: 1, 
      display: "flex", 
      flexDirection: "column",
      overflowY: "auto",
      position: "relative"
    }}>
      {children}
    </div>
  );
}

export function TopBar({ children }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 24px",
      backgroundColor: "#fff",
      borderBottom: `1px solid ${C.line}`,
      minHeight: 60,
      position: "sticky",
      top: 0,
      zIndex: 10
    }}>
      {children}
    </div>
  );
}