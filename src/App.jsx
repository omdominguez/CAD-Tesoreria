import { useAuth } from "./auth.jsx";
import { isConfigured } from "./supabase.js";
import Login from "./Login.jsx";
import Workspace from "./Workspace.jsx";

const PAPER = "#FBFAF6", GREEN = "#1B5E20", INK = "#1F2933", MUT = "#6B7A70", LINE = "#E3E6DE";
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

export default function App() {
  const { loading, session } = useAuth();
  if (!isConfigured) return <Config />;
  if (loading) return <Splash />;
  if (!session) return <Login />;
  return <Workspace />;
}

function Splash() {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, color: MUT, fontFamily: SANS }}>Cargando…</div>;
}

function Config() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, fontFamily: SANS, padding: 20 }}>
      <div style={{ maxWidth: 540, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: 28 }}>
        <h1 style={{ color: GREEN, fontSize: 20, margin: "0 0 10px" }}>Falta conectar la base de datos</h1>
        <p style={{ color: INK, fontSize: 14, lineHeight: 1.55, margin: "0 0 10px" }}>
          Crea un archivo <code>.env</code> en la raíz del proyecto con tus claves de Supabase
          (<code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>) y reinicia el servidor.
        </p>
        <p style={{ color: MUT, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          Copia <code>.env.example</code> como <code>.env</code> y sigue los pasos del <b>README</b>.
        </p>
      </div>
    </div>
  );
}
