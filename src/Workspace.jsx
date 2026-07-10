import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Wallet, 
  Settings, 
  LogOut, 
  Menu, 
  X 
} from "lucide-react";

// Contexto de Autenticación
import { useAuth } from "./services/auth";

// Tema
import { C, FONTS } from "./constants/theme";

// Componentes UI de Layout Global
import { AppShell, Sidebar, SidebarBackdrop, TopBar, MainContent, SidebarItem } from "./components/ui/Layout";
import { Btn } from "./components/ui/Buttons";
import { ThemeToggle } from "./components/ui/ThemeToggle";
import { TickerTasas } from "./components/shared/TickerTasas";
import { useIsMobile } from "./hooks/useIsMobile";
import { LOGO_MARK } from "./logo.jsx";

// Vistas Principales (Los módulos que creamos)
import Tablero from "./views/Tablero/Tablero";
import Directorio from "./views/Directorio/Directorio";
import Compromisos from "./views/Compras/Compromisos";
import ModuloTesoreria from "./views/Tesoreria/ModuloTesoreria";
import ModuloAjustes from "./views/Ajustes/ModuloAjustes";

export default function Workspace({ st, act }) {
  const { user, role, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [modulo, setModulo] = useState("tablero");
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobile);

  // En móvil el sidebar arranca cerrado (es un panel superpuesto);
  // en escritorio arranca abierto (empuja el contenido).
  useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

  // Navegar a un módulo: en móvil, además cierra el panel para
  // que el usuario vea de una vez la vista elegida.
  const ir = (m) => { setModulo(m); if (isMobile) setSidebarOpen(false); };

  // Mapeo semántico de los nombres de los roles para mostrar en el TopBar
  const ROL_LBL = {
    MASTER: "Gerencia General",
    COMPRAS: "Dpto. de Compras",
    TESORERIA: "Tesorería y Bancos"
  };

  return (
    <AppShell>
      {/* Fondo oscuro detrás del sidebar cuando es un panel móvil superpuesto */}
      <SidebarBackdrop show={isMobile && sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* 1. BARRA LATERAL DE NAVEGACIÓN (SIDEBAR) */}
      <Sidebar open={sidebarOpen} mobile={isMobile}>
        <div>
          {/* Logo o Cabecera del Sistema */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 16px", borderBottom: `1px solid ${C.line}`, marginBottom: 16 }}>
            <img src={LOGO_MARK} alt="" style={{ height: 32, width: "auto", display: "block", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: FONTS.SANS, fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: -0.3, lineHeight: 1.15 }}>
                EL MAIZALITO
              </div>
              <div style={{ fontSize: 10, color: C.mut, fontWeight: 700, marginTop: 1, letterSpacing: 0.5, textTransform: "uppercase" }}>
                SISTEMA FINANCIERO
              </div>
            </div>
          </div>

          {/* Items de Navegación según Rol */}
          <div style={{ display: "grid", gap: 4, padding: "0 8px" }}>
            <SidebarItem act={modulo === "tablero"} onClick={() => ir("tablero")}>
              <LayoutDashboard size={16} /> Tablero Principal
            </SidebarItem>

            <SidebarItem act={modulo === "directorio"} onClick={() => ir("directorio")}>
              <Users size={16} /> Directorio
            </SidebarItem>

            {/* Compras: Accesible por Compras y Gerencia (Master) */}
            {(role === "COMPRAS" || role === "MASTER") && (
              <SidebarItem act={modulo === "compras"} onClick={() => ir("compras")}>
                <ShoppingCart size={16} /> Módulo Compras
              </SidebarItem>
            )}

            {/* Tesorería: Accesible por Tesorería y Gerencia (Master) */}
            {(role === "TESORERIA" || role === "MASTER") && (
              <SidebarItem act={modulo === "tesoreria"} onClick={() => ir("tesoreria")}>
                <Wallet size={16} /> Módulo Tesorería
              </SidebarItem>
            )}

            {/* Ajustes: Accesible por todos (cada subpestaña filtrará internamente) */}
            <SidebarItem act={modulo === "ajustes"} onClick={() => ir("ajustes")}>
              <Settings size={16} /> Ajustes del Sistema
            </SidebarItem>
          </div>
        </div>

        {/* Botón de Salida (Bottom del Sidebar) */}
        <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, letterSpacing: 0.5, textTransform: "uppercase", padding: "0 2px 6px" }}>
              Apariencia
            </div>
            <ThemeToggle compact />
          </div>
          <SidebarItem style={{ color: C.rojo }} onClick={signOut}>
            <LogOut size={16} /> Cerrar Sesión
          </SidebarItem>
        </div>
      </Sidebar>

      {/* 2. CONTENEDOR PRINCIPAL DE CONTENIDO */}
      <MainContent sidebarOpen={sidebarOpen}>
        {/* Barra Superior Informativa */}
        <TopBar>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0, flex: 1 }}>
            <Btn small variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: 6, flexShrink: 0 }}>
              {sidebarOpen && !isMobile ? <X size={18} /> : <Menu size={18} />}
            </Btn>
            <TickerTasas st={st} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "right", flexShrink: 0 }}>
            {!isMobile && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{user?.email}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.mut }}>{ROL_LBL[role] || "Usuario"}</div>
              </div>
            )}
            {isMobile && (
              <div
                title={user?.email}
                style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: C.greenSoft, color: C.greenDk,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, fontFamily: FONTS.SANS,
                }}
              >
                {(user?.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </TopBar>

        {/* Renderizado Dinámico de Vistas según el estado 'modulo' */}
        <div style={{ padding: isMobile ? "4px 14px 32px" : "4px 24px 40px" }}>
          {modulo === "tablero" && <Tablero st={st} />}
          {modulo === "directorio" && <Directorio st={st} />}
          {modulo === "compras" && (role === "COMPRAS" || role === "MASTER") && (
            <Compromisos st={st} act={act} rol={role} />
          )}
          {modulo === "tesoreria" && (role === "TESORERIA" || role === "MASTER") && (
            <ModuloTesoreria st={st} act={act} rol={role} />
          )}
          {modulo === "ajustes" && (
            <ModuloAjustes st={st} act={act} rol={role} meId={user?.id} />
          )}
        </div>
      </MainContent>
    </AppShell>
  );
}