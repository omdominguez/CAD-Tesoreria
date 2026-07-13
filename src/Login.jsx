import { useState } from "react";
import { useAuth } from "./services/auth";
import { LOGO, LOGO_MAIZALITO } from "./logo.jsx";
import { C, FONTS, UI } from "./constants/theme";
import { ChecklistPassword } from "./components/ChecklistPassword.jsx";
import { passwordEsValida } from "./utils/validarPassword.js";

const input = { width: "100%", padding: "11px 12px", border: `1px solid ${C.line}`, borderRadius: UI.RADIUS_SM, fontSize: 14, fontFamily: FONTS.SANS, color: C.ink, background: C.paper, boxSizing: "border-box", marginBottom: 12, outline: "none" };

export default function Login() {
  const { signIn, signUp, enviarCorreoRecuperacion } = useAuth();
  const [modo, setModo] = useState("in"); // 'in' | 'up' | 'forgot'
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState(null);
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);

  const limpiar = () => { setMsg(null); setOk(null); };

  const irA = (m) => { setModo(m); limpiar(); };

  const enviar = async () => {
    limpiar();

    if (modo === "forgot") {
      if (!email) { setMsg("Escribe tu correo."); return; }
      setBusy(true);
      try {
        const { error } = await enviarCorreoRecuperacion(email);
        if (error) setMsg(traducir(error.message));
        else setOk("Si ese correo está registrado, te llegará un link para restablecer tu contraseña. Revisa también spam.");
      } catch (e) {
        setMsg("Ocurrió un error. Verifica tu conexión e inténtalo de nuevo.");
      }
      setBusy(false);
      return;
    }

    if (!email || !pass) { setMsg("Escribe tu correo y contraseña."); return; }

    if (modo === "up") {
      if (!nombre.trim() || !apellido.trim()) { setMsg("Escribe tu nombre y apellido."); return; }
      if (!passwordEsValida(pass)) { setMsg("Tu contraseña todavía no cumple los requisitos de seguridad."); return; }
    }

    setBusy(true);
    try {
      if (modo === "in") {
        const { error } = await signIn(email, pass);
        if (error) setMsg(traducir(error.message));
      } else {
        const { error } = await signUp(email, pass, nombre.trim(), apellido.trim());
        if (error) setMsg(traducir(error.message));
        else setOk("Cuenta creada. Si tu proyecto pide confirmar el correo, revisa tu bandeja; si no, ya puedes iniciar sesión.");
      }
    } catch (e) {
      setMsg("Ocurrió un error. Verifica tu conexión e inténtalo de nuevo.");
    }
    setBusy(false);
  };

  const titulo = modo === "in" ? "Iniciar sesión" : modo === "up" ? "Crear cuenta" : "Restablecer contraseña";
  const subtitulo =
    modo === "in" ? "Entra con tu usuario del equipo." :
    modo === "up" ? "Regístrate; el Master te asignará tu rol." :
    "Escribe tu correo y te mandamos un link para poner una nueva contraseña.";

  return (
    <div style={{ minHeight: "100vh", background: C.body, fontFamily: FONTS.SANS, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 384 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <img src={LOGO} alt="CAD Venezuela" style={{ height: 56, display: "block" }} />
          <div style={{ fontSize: 12, color: C.mut, textAlign: "center" }}>Tesorería &amp; Proyección de Pagos</div>
          <img src={LOGO_MAIZALITO} alt="El Maizalito" style={{ height: 22, display: "block", marginTop: 2 }} />
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: UI.RADIUS + 2, padding: 26, boxShadow: UI.SHADOW }}>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4, letterSpacing: -0.3 }}>{titulo}</div>
          <div style={{ fontSize: 13, color: C.mut, marginBottom: 20 }}>{subtitulo}</div>

          {msg && <div style={{ background: C.rojoSoft, color: C.rojo, padding: "9px 12px", borderRadius: UI.RADIUS_SM, fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}
          {ok && <div style={{ background: C.verdeSoft, color: C.verde, padding: "9px 12px", borderRadius: UI.RADIUS_SM, fontSize: 12.5, marginBottom: 12 }}>{ok}</div>}

          {modo === "up" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} style={input} />
              <input placeholder="Apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} style={input} />
            </div>
          )}

          <input type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && enviar()} />

          {modo !== "forgot" && (
            <input type="password" placeholder="Contraseña" value={pass} onChange={(e) => setPass(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && enviar()} />
          )}

          {modo === "up" && pass.length > 0 && <ChecklistPassword password={pass} />}

          {modo === "in" && (
            <div style={{ textAlign: "right", marginTop: -6, marginBottom: 14 }}>
              <button onClick={() => irA("forgot")} style={{ background: "none", border: "none", color: C.mut, fontSize: 12, cursor: "pointer", fontFamily: FONTS.SANS }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button onClick={enviar} disabled={busy} style={{ width: "100%", padding: "11px", background: C.gold, color: "#fff", border: "none", borderRadius: UI.RADIUS_SM, fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: FONTS.SANS }}>
            {busy ? "Un momento…" : modo === "in" ? "Entrar" : modo === "up" ? "Registrarme" : "Enviar link de recuperación"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.mut }}>
            {modo === "in" && (
              <>
                ¿No tienes cuenta?{" "}
                <button onClick={() => irA("up")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: FONTS.SANS }}>
                  Crear una
                </button>
              </>
            )}
            {modo === "up" && (
              <>
                ¿Ya tienes cuenta?{" "}
                <button onClick={() => irA("in")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: FONTS.SANS }}>
                  Iniciar sesión
                </button>
              </>
            )}
            {modo === "forgot" && (
              <button onClick={() => irA("in")} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: FONTS.SANS }}>
                ← Volver a iniciar sesión
              </button>
            )}
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
