import { useState } from "react";
import { useAuth } from "./services/auth";
import { LOGO } from "./logo.jsx";
import { C, FONTS, UI } from "./constants/theme";
import { ChecklistPassword } from "./components/ChecklistPassword.jsx";
import { passwordEsValida } from "./utils/validarPassword.js";

const input = { width: "100%", padding: "11px 12px", border: `1px solid ${C.line}`, borderRadius: UI.RADIUS_SM, fontSize: 14, fontFamily: FONTS.SANS, color: C.ink, background: C.paper, boxSizing: "border-box", marginBottom: 12, outline: "none" };

/**
 * Se muestra cuando alguien llega a la app desde el link de "olvidé mi
 * contraseña" del correo. Supabase ya lo dejó con una sesión temporal
 * válida solo para cambiar la contraseña — aquí se la pedimos y listo.
 */
export default function PantallaRecuperacion() {
  const { actualizarPassword, salirDeRecuperacion, signOut } = useAuth();
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const guardar = async () => {
    setMsg(null);
    if (!passwordEsValida(pass)) { setMsg("Tu contraseña todavía no cumple los requisitos de seguridad."); return; }
    if (pass !== pass2) { setMsg("Las dos contraseñas no coinciden."); return; }

    setBusy(true);
    try {
      const { error } = await actualizarPassword(pass);
      if (error) setMsg(error.message);
      else setOk(true);
    } catch (e) {
      setMsg("Ocurrió un error. Inténtalo de nuevo.");
    }
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.body, fontFamily: FONTS.SANS, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 384 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <img src={LOGO} alt="CAD Venezuela" style={{ height: 56, display: "block" }} />
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: UI.RADIUS + 2, padding: 26, boxShadow: UI.SHADOW }}>
          {ok ? (
            <>
              <div style={{ fontFamily: FONTS.SANS, fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 8 }}>Contraseña actualizada</div>
              <div style={{ fontSize: 13, color: C.mut, marginBottom: 20 }}>Ya puedes iniciar sesión con tu nueva contraseña.</div>
              <button
                onClick={async () => { await signOut(); salirDeRecuperacion(); }}
                style={{ width: "100%", padding: "11px", background: C.ink, color: "#fff", border: "none", borderRadius: UI.RADIUS_SM, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.SANS }}
              >
                Ir a iniciar sesión
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: FONTS.SANS, fontSize: 18, fontWeight: 800, color: C.ink, marginBottom: 4 }}>Pon tu nueva contraseña</div>
              <div style={{ fontSize: 13, color: C.mut, marginBottom: 20 }}>Elige una contraseña segura para tu cuenta.</div>

              {msg && <div style={{ background: C.rojoSoft, color: C.rojo, padding: "9px 12px", borderRadius: UI.RADIUS_SM, fontSize: 12.5, marginBottom: 12 }}>{msg}</div>}

              <input type="password" placeholder="Nueva contraseña" value={pass} onChange={(e) => setPass(e.target.value)} style={input} />
              {pass.length > 0 && <ChecklistPassword password={pass} />}
              <input type="password" placeholder="Confirma la nueva contraseña" value={pass2} onChange={(e) => setPass2(e.target.value)} style={input} onKeyDown={(e) => e.key === "Enter" && guardar()} />

              <button
                onClick={guardar}
                disabled={busy}
                style={{ width: "100%", padding: "11px", background: C.ink, color: "#fff", border: "none", borderRadius: UI.RADIUS_SM, fontSize: 14, fontWeight: 700, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: FONTS.SANS }}
              >
                {busy ? "Guardando…" : "Guardar nueva contraseña"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
