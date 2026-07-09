import React, { useState } from "react";
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
import { AppShell, Sidebar, TopBar, MainContent, SidebarItem } from "./components/ui/Layout";
import { Btn } from "./components/ui/Buttons";
import { ThemeToggle } from "./components/ui/ThemeToggle";

// Vistas Principales (Los módulos que creamos)
import Tablero from "./views/Tablero/Tablero";
import Directorio from "./views/Directorio/Directorio";
import Compromisos from "./views/Compras/Compromisos";
import ModuloTesoreria from "./views/Tesoreria/ModuloTesoreria";
import ModuloAjustes from "./views/Ajustes/ModuloAjustes";

export default function Workspace({ st, act }) {
  const { user, role, signOut } = useAuth();
  const [modulo, setModulo] = useState("tablero");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mapeo semántico de los nombres de los roles para mostrar en el TopBar
  const ROL_LBL = {
    MASTER: "Gerencia General",
    COMPRAS: "Dpto. de Compras",
    TESORERIA: "Tesorería y Bancos"
  };

  return (
    <AppShell>
      {/* 1. BARRA LATERAL DE NAVEGACIÓN (SIDEBAR) */}
      <Sidebar open={sidebarOpen}>
        <div>
          {/* Logo o Cabecera del Sistema */}
          <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.line}`, marginBottom: 16 }}>
            <div style={{ fontFamily: FONTS.SANS, fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: -0.3 }}>
              EL MAIZALITO
            </div>
            <div style={{ fontSize: 10.5, color: C.mut, fontWeight: 700, marginTop: 2, letterSpacing: 0.6, textTransform: "uppercase" }}>
              SISTEMA FINANCIERO
            </div>
          </div>

          {/* Items de Navegación según Rol */}
          <div style={{ display: "grid", gap: 4, padding: "0 8px" }}>
            <SidebarItem act={modulo === "tablero"} onClick={() => setModulo("tablero")}>
              <LayoutDashboard size={16} /> Tablero Principal
            </SidebarItem>

            <SidebarItem act={modulo === "directorio"} onClick={() => setModulo("directorio")}>
              <Users size={16} /> Directorio
            </SidebarItem>

            {/* Compras: Accesible por Compras y Gerencia (Master) */}
            {(role === "COMPRAS" || role === "MASTER") && (
              <SidebarItem act={modulo === "compras"} onClick={() => setModulo("compras")}>
                <ShoppingCart size={16} /> Módulo Compras
              </SidebarItem>
            )}

            {/* Tesorería: Accesible por Tesorería y Gerencia (Master) */}
            {(role === "TESORERIA" || role === "MASTER") && (
              <SidebarItem act={modulo === "tesoreria"} onClick={() => setModulo("tesoreria")}>
                <Wallet size={16} /> Módulo Tesorería
              </SidebarItem>
            )}

            {/* Ajustes: Accesible por todos (cada subpestaña filtrará internamente) */}
            <SidebarItem act={modulo === "ajustes"} onClick={() => setModulo("ajustes")}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Btn small variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ padding: 6 }}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </Btn>
            <div style={{ fontSize: 13, color: C.mut, fontWeight: 500 }}>
              Tasa BCV del día: <b style={{ color: C.ink, fontVariantNumeric: "tabular-nums" }}>Bs {Number(st.config?.tasaBCV || 0).toFixed(2)}</b>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "right" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{user?.email}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.mut }}>{ROL_LBL[role] || "Usuario"}</div>
            </div>
          </div>
        </TopBar>

        {/* Renderizado Dinámico de Vistas según el estado 'modulo' */}
        <div style={{ padding: "4px 0" }}>
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