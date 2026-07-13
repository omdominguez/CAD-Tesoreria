/* ============================================================
   App.jsx — ORQUESTADOR PRINCIPAL
   ------------------------------------------------------------
   Este archivo se encarga solo de 3 cosas:
     1. Cargar el estado global desde Supabase al iniciar sesión
      (y mantenerlo sincronizado en tiempo real).
     2. Armar el objeto `act` con TODAS las acciones que pueden
        modificar ese estado (delegado a src/actions/ — ver ahí
        el detalle de cada dominio de negocio).
     3. Decidir qué pantalla mostrar según el estado de la sesión
        (cargando / login / pendiente de aprobación / recuperar
        contraseña / la app en sí).

   Si buscas la LÓGICA de una acción puntual (ej. "¿qué pasa
   exactamente cuando se aprueba una corrida?"), no está aquí —
   está en src/actions/actionsCorridas.js (o el archivo del
   dominio que corresponda). Este archivo solo los conecta.
   ============================================================ */
import React, { useState, useEffect } from "react";

// Servicios de Autenticación y Store
import { AuthProvider, useAuth } from "./services/auth";
import { loadState, saveState, subscribeState } from "./services/store";

// Componentes Contenedores
import Login from "./Login";
import Workspace from "./Workspace";
import PantallaRecuperacion from "./PantallaRecuperacion";

// Constantes de Diseño Base
import { C } from "./constants/theme";

// Histórico de tasas (para el ticker estilo bolsa de valores)
import { conSnapshotDeHoy, hoyStr } from "./utils/finance";

// Todas las acciones que mutan el estado global, organizadas por dominio
// de negocio (ver src/actions/index.js para el detalle de cada una)
import { crearAcciones } from "./actions";

// Auto-actualización diaria de tasas desde fuentes externas
import { useAutoTasas } from "./hooks/useAutoTasas";

// El estado inicial por defecto si la base de datos está totalmente vacía
const EMPTY_STATE = {
  config: { tasaBCV: "1.00", tasaIntervencion: "1.00", tasaParalelo: "1.00", tasaBcvEuro: "1.00" },
  historialTasas: {},
  tasasAutoActualizadas: null,
  bancos: [],
  proveedores: [],
  compromisos: [],
  movimientos: [],
  cuentasCobrar: [],
  cobranzas: [],
  corridas: []
};

/* ============================================================
   INNER APP: Maneja la lógica operativa una vez resuelto el Auth
   ============================================================ */
function InnerApp() {
  const { user, profile, role, activo, loading: authLoading, signOut, modoRecuperacion } = useAuth();
  const [st, setSt] = useState(null);
  const [storeLoading, setStoreLoading] = useState(true);

  // 1. Efecto para cargar el estado inicial y suscribirse al Real-Time de Supabase
  useEffect(() => {
    if (!user || !role) {
      setSt(null);
      return;
    }

    setStoreLoading(true);

    // Carga inicial del JSON desde la tabla 'app_state'
    loadState()
      .then((dbState) => {
        const base = dbState || EMPTY_STATE;
        // Si hoy todavía no tiene una foto de las tasas guardada, la registramos
        // ahora mismo (así el ticker siempre tiene con qué comparar el día
        // anterior, incluso si nadie editó las tasas hoy).
        const yaTieneHoy = Boolean(base.historialTasas?.[hoyStr()]);
        const conHistorial = yaTieneHoy ? base : conSnapshotDeHoy(base);
        setSt(conHistorial);
        setStoreLoading(false);
        if (!yaTieneHoy) saveState(conHistorial, user.id).catch(console.error);
      })
      .catch((err) => {
        console.error("Error crítico cargando estado:", err);
        setSt(EMPTY_STATE);
        setStoreLoading(false);
      });

    // Suscripción en tiempo real: si otro usuario edita algo, impacta aquí de inmediato
    const unsubscribe = subscribeState((newState) => {
      if (newState) setSt(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id, role]);

  // 2. Orquestador de Acciones Globales (Mutadores del Estado)
  // Cada acción despacha el cambio localmente y lo persiste de inmediato
  // en Supabase — el detalle de cada una vive en src/actions/ (organizado
  // por dominio de negocio, no todo amontonado aquí).
  const act = crearAcciones(setSt, user?.id);

  // Auto-actualización diaria de tasas (solo para roles que pueden editarlas)
  useAutoTasas(st, act, Boolean(role === "MASTER" || role === "TESORERIA"));

  // 3. Renderizado condicional según el estado de la sesión

  // Prioridad máxima: si llegó desde el link de "olvidé mi contraseña",
  // mostramos esa pantalla sin importar en qué otro estado esté la cuenta.
  if (modoRecuperacion) {
    return <PantallaRecuperacion />;
  }

  if (authLoading || (user && !profile) || (user && role && storeLoading)) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.paper, fontFamily: "sans-serif", color: C.mut, fontSize: 14 }}>
        Sincronizando con El Maizalito Real-Time...
      </div>
    );
  }

  // Cuenta creada pero todavía no autorizada por un Master
  if (user && profile && !activo) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.paper, fontFamily: "sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.amarSoft, color: C.amar, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>
            ⏳
          </div>
          <div style={{ fontFamily: "serif", fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
            Tu cuenta está pendiente de aprobación
          </div>
          <div style={{ fontSize: 13.5, color: C.mut, lineHeight: 1.5, marginBottom: 20 }}>
            Ya te registraste con <b>{user.email}</b>. Un administrador (Master) necesita autorizar tu acceso
            y asignarte un rol antes de que puedas entrar. Te avisaremos apenas esté listo.
          </div>
          <button
            onClick={signOut}
            style={{ background: C.gold, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return user && role && st ? <Workspace st={st} act={act} /> : <Login />;
}

/* ============================================================
   EXPORT CENTRAL: Envoltorio del AuthProvider
   ============================================================ */
export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}