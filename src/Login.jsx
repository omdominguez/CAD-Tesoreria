import { useState } from "react";
import { useAuth } from "./auth.jsx";

const GREEN = "#1B5E20", GOLD = "#B8860B", PAPER = "#FBFAF6", INK = "#1F2933", MUT = "#6B7A70", LINE = "#E3E6DE";
const SERIF = "'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif";
const SANS = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [modo, setModo] = useState("in"); // 'in' | 'up'
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const enviar = async () => {
    setMsg(null); setOk(null);
    if (!email || !pass) { setMsg("Escribe tu correo y contraseña."); return; }
    setBusy(true);
    try {
      if (modo === "in") {
        const { error } = await signIn(email, pass);
        if (error) setMsg(traducir(error.message));
      } else {
        const { error } = await signUp(email, pass);
        if (error) setMsg(traducir(error.message));
        else setOk("Cuenta creada. Si tu proyecto pide confirmar el correo, revisa tu bandeja; si no, ya puedes iniciar sesión.");
      }
    } catch (e) {
      setMsg("Ocurrió un error. Verifica tu conexión e inténtalo de nuevo.");
    }
    setBusy(false);
  };

  const input = { width: "100%", padding: "11px 12px", border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 14, fontFamily: SANS, color: INK, background: PAPER, boxSizing: "border-box", marginBottom: 12 };

  return (
    <div style={{ minHeight: "100vh", background: PAPER, fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 800, fontSize: 24, color: "#fff" }}>M</div>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: GREEN, lineHeight: 1.1 }}>El Maizalito · CAD</div>
            <div style={{ fontSize: 12, color: MUT }}>Soporte financiero y proyección de pagos</div>
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: 24, boxShadow: "0 12px 40px rgba(0,0,0,0.06)" }}>
          <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 700, color: INK, marginBottom: 4 }}>{modo === "in" ? "Iniciar sesión" : "Crear cuenta"}</div>
          <div style={{ fontSize: 13, color: MUT, marginBottom: 18 }}>{modo === "in" ? "Entra con tu usuario del equipo." : "Regístrate; el Master te asignará tu rol."}</div>

          {msg && <div style={{ background: "#FBEAE7", color: "#B23B2E", padding: "9px 12px", borderRadius: 9, fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}
          {ok && <div style={{ background: "#E6F4EA", color: "#16803C", padding: "9px 12px", borderRadius: 9, fontSize: 12.5, marginBottom: 12 }}>{ok}</div>}

          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && enviar()} />
          <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && enviar()} />

          <button onClick={enviar} disabled={busy} style={{ width: "100%", padding: "11px", background: GREEN, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? "Un momento…" : modo === "in" ? "Entrar" : "Registrarme"}
          </button>

          <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: MUT }}>
            {modo === "in" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button onClick={() => { setModo(modo === "in" ? "up" : "in"); setMsg(null); setOk(null); }} style={{ background: "none", border: "none", color: GREEN, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              {modo === "in" ? "Crear una" : "Iniciar sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function traducir(m = "") {
  if (/Invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos.";
  if (/already registered/i.test(m)) return "Ese correo ya está registrado. Inicia sesión.";
  if (/at least 6 characters/i.test(m)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/Email not confirmed/i.test(m)) return "Debes confirmar tu correo antes de entrar.";
  return m;
}
