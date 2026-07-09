import React from "react";
import { X } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";

/* ============================================================
   COMPONENTES DE UI BÁSICOS
   ============================================================ */

export function Card({ children, style }) { 
  return (
    <div style={{ 
      background: C.surface, 
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
        background: "rgba(14,17,13,0.45)", 
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
          background: C.surface, 
          borderRadius: UI.RADIUS + 2, 
          width: "100%", 
          maxWidth: wide ? 900 : 480, 
          boxShadow: UI.SHADOW_MODAL,
          border: `1px solid ${C.line}`,
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: "16px 22px", 
          borderBottom: `1px solid ${C.line}` 
        }}>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: -0.2 }}>
            {title}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: C.paper, 
              border: `1px solid ${C.line}`, 
              width: 30, 
              height: 30, 
              borderRadius: UI.RADIUS_SM, 
              cursor: "pointer", 
              color: C.mut, 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}
          >
            <X size={17} />
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
    <div style={{ textAlign: "center", padding: "48px 20px", border: `1px dashed ${C.line}`, borderRadius: UI.RADIUS, background: C.surface }}>
      <div style={{ 
        width: 52, 
        height: 52, 
        borderRadius: UI.RADIUS_SM, 
        background: C.body, 
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center", 
        color: C.ink 
      }}>
        <Icon size={24} />
      </div>
      <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 14, letterSpacing: -0.2 }}>
        {title}
      </div>
      <div style={{ color: C.mut, fontSize: 13.5, marginTop: 6, maxWidth: 420, marginInline: "auto" }}>
        {msg}
      </div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Section({ title, desc, action, children, eyebrow }) {
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
          {eyebrow && (
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
              {eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: FONTS.SANS, fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: -0.4 }}>
            {title}
          </h2>
          {desc && (
            <p style={{ color: C.mut, fontSize: 13.5, margin: "6px 0 0", maxWidth: 680 }}>
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
    <div style={{ display: "flex", height: "100vh", backgroundColor: C.body, overflow: "hidden", fontFamily: FONTS.SANS }}>
      {children}
    </div>
  );
}

export function Sidebar({ open, children }) {
  return (
    <div style={{ 
      width: open ? 252 : 0, 
      transition: "width 0.2s ease", 
      backgroundColor: C.body, 
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
        gap: 11,
        padding: "9px 12px",
        width: "100%",
        borderRadius: UI.RADIUS_SM,
        border: "none",
        borderLeft: act ? `2px solid ${C.green}` : "2px solid transparent",
        backgroundColor: act ? C.surface : "transparent",
        boxShadow: act ? UI.SHADOW : "none",
        color: act ? C.ink : C.mut,
        fontWeight: act ? 700 : 500,
        fontSize: 13.5,
        cursor: "pointer",
        textAlign: "left",
        transition: "background-color .12s, color .12s",
        fontFamily: FONTS.SANS,
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
      position: "relative",
      backgroundColor: C.paper,
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
      backgroundColor: C.surface,
      borderBottom: `1px solid ${C.line}`,
      minHeight: 58,
      position: "sticky",
      top: 0,
      zIndex: 10
    }}>
      {children}
    </div>
  );
}
