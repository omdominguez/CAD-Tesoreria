import React from "react";
import { X } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";
import { useIsMobile } from "../../hooks/useIsMobile";

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
  const isMobile = useIsMobile();
  return (
    <div 
      onClick={onClose} 
      style={{ 
        position: "fixed", 
        inset: 0, 
        background: "rgba(14,17,13,0.35)", 
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", 
        alignItems: isMobile ? "flex-end" : "flex-start", 
        justifyContent: "center", 
        padding: isMobile ? 0 : "5vh 16px", 
        zIndex: 50, 
        overflowY: "auto" 
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(var(--glass-blur)) saturate(180%)",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(180%)",
          borderRadius: isMobile ? "18px 18px 0 0" : UI.RADIUS + 2, 
          width: "100%", 
          maxWidth: isMobile ? "100%" : (wide ? 900 : 480), 
          boxShadow: `${UI.SHADOW_MODAL}, var(--glass-highlight)`,
          border: "1px solid var(--glass-border)",
        }}
      >
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          padding: isMobile ? "14px 16px" : "16px 22px", 
          borderBottom: `1px solid ${C.line}` 
        }}>
          <div style={{ fontFamily: FONTS.SANS, fontSize: isMobile ? 15 : 16, fontWeight: 700, color: C.ink, letterSpacing: -0.2 }}>
            {title}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: C.paper, 
              border: `1px solid ${C.line}`, 
              width: 34, 
              height: 34, 
              borderRadius: UI.RADIUS_SM, 
              cursor: "pointer", 
              color: C.mut, 
              display: "inline-flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: isMobile ? 16 : 22, maxHeight: isMobile ? "85vh" : "80vh", overflowY: "auto" }}>
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
  const isMobile = useIsMobile();
  return (
    <div>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "flex-end", 
        flexWrap: "wrap", 
        gap: 10, 
        marginBottom: isMobile ? 14 : 18 
      }}>
        <div>
          {eyebrow && (
            <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>
              {eyebrow}
            </div>
          )}
          <h2 style={{ fontFamily: FONTS.SANS, fontSize: isMobile ? 19 : 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: -0.4 }}>
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
    <div style={{ display: "flex", height: "100vh", backgroundColor: C.body, overflow: "hidden", fontFamily: FONTS.SANS, position: "relative" }}>
      {/* Manchas de color detrás del sidebar/topbar: son lo que el
          desenfoque translúcido (liquid glass) deja ver a través. */}
      <div className="cad-glass-blob cad-glass-blob-a" />
      <div className="cad-glass-blob cad-glass-blob-b" />
      {children}
    </div>
  );
}

export function Sidebar({ open, mobile, children }) {
  if (mobile) {
    return (
      <div
        className="cad-sidebar-mobile"
        style={{
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0,
          width: "min(82vw, 288px)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          background: "var(--glass-bg-strong)",
          backdropFilter: "blur(var(--glass-blur)) saturate(180%)",
          WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(180%)",
          borderRight: "1px solid var(--glass-border)",
          boxShadow: open ? "0 0 40px rgba(0,0,0,0.25)" : "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflowY: "auto",
          zIndex: 40,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div style={{ 
      width: open ? 252 : 0, 
      transition: "width 0.2s ease", 
      background: "var(--glass-bg)",
      backdropFilter: "blur(var(--glass-blur)) saturate(180%)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(180%)",
      borderRight: "1px solid var(--glass-border)",
      boxShadow: "var(--glass-highlight)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
      whiteSpace: "nowrap",
      flexShrink: 0,
      position: "relative",
      zIndex: 1,
    }}>
      {children}
    </div>
  );
}

/** Fondo oscuro y difuminado detrás del sidebar móvil; al tocarlo, se cierra. */
export function SidebarBackdrop({ show, onClose }) {
  if (!show) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,12,8,0.4)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        zIndex: 35,
      }}
    />
  );
}

export function SidebarItem({ act, onClick, children, style }) {
  return (
    <button 
      className="cad-sidebar-item"
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
        // El fondo solo se fija en línea cuando el ítem está activo;
        // si no, lo controla el CSS (.cad-sidebar-item:hover) para
        // permitir el efecto de pasar el mouse por encima.
        ...(act ? { backgroundColor: C.surface, boxShadow: UI.SHADOW } : {}),
        color: act ? C.ink : C.mut,
        fontWeight: act ? 700 : 500,
        fontSize: 13.5,
        cursor: "pointer",
        textAlign: "left",
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
      zIndex: 1,
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
      background: "var(--glass-bg-strong)",
      backdropFilter: "blur(var(--glass-blur)) saturate(180%)",
      WebkitBackdropFilter: "blur(var(--glass-blur)) saturate(180%)",
      borderBottom: "1px solid var(--glass-border)",
      boxShadow: "var(--glass-highlight)",
      minHeight: 58,
      position: "sticky",
      top: 0,
      zIndex: 10
    }}>
      {children}
    </div>
  );
}
