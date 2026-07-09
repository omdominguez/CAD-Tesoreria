import { useState } from "react";
import { useAuth } from "./services/auth";
import { LOGO } from "./logo.jsx";
import { C, FONTS, UI } from "./constants/theme";

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

  const input = { width: "100%", padding: "11px 12px", border: `1px solid ${C.line}`, borderRadius: UI.RADIUS_SM, fontSize: 14, fontFamily: FONTS.SANS, color: C.ink, background: C.paper, boxSizing: "border-box", marginBottom: 12, outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: C.body, fontFamily: FONTS.SANS, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 384 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <img src={LOGO} alt="CAD Venezuela" style={{ height: 56, display: "block" }} />
          <div style={{ fontSize: 12.5, color: C.mut, textAlign: "center" }}>Tesorería &amp; Proyección de Pagos · El Maizalito</div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: UI.RADIUS + 2, padding: 26, boxShadow: UI.SHADOW }}>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4, letterSpacing: -0.3 }}>{modo === "in" ? "Iniciar sesión" : "Crear cuenta"}</div>
          <div style={{ fontSize: 13, color: C.mut, marginBottom: 20 }}>{modo === "in" ? "Entra con tu usuario del equipo." : "Regístrate; el Master te asignará tu rol."}</div>

          {msg && <div style={{ background: C.rojoSoft, color: C.rojo, padding: "9px 12px", borderRadius: UI.RADIUS_SM, fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}
          {ok && <div style={{ background: C.verdeSoft, color: C.verde, padding: "9px 12px", borderRadius: UI.RADIUS_SM, fontSize: 12.5, marginBottom: 12 }}>{ok}</div>}

          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && enviar()} />
          <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && enviar()} />

          <button onClick={enviar} disabled={busy} style={{ width: "100%", padding: "11px", background: C.ink, color: "#fff", border: "none", borderRadius: UI.RADIUS_SM, fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: FONTS.SANS }}>
            {busy ? "Un momento…" : modo === "in" ? "Entrar" : "Registrarme"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.mut }}>
            {modo === "in" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
            <button onClick={() => { setModo(modo === "in" ? "up" : "in"); setMsg(null); setOk(null); }} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: FONTS.SANS }}>
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
