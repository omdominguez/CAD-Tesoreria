import React, { useState } from "react";
import { User, Camera, Loader2 } from "lucide-react";
import { useAuth } from "../services/auth";
import { C, FONTS } from "../constants/theme";
import { Modal } from "./ui/Layout";
import { Field, Input } from "./ui/Forms";
import { Btn, Segmented } from "./ui/Buttons";
import { ChecklistPassword } from "./ChecklistPassword.jsx";
import { passwordEsValida } from "../utils/validarPassword";
import { actualizarMiPerfil, uploadAdjunto, getAdjuntoUrl } from "../services/store";

/** Panel de configuración de la cuenta personal: datos, foto y contraseña. */
export function ModalMiCuenta({ onClose }) {
  const { user, profile, refreshProfile, actualizarPassword } = useAuth();
  const [tab, setTab] = useState("datos"); // 'datos' | 'password'

  return (
    <Modal title="Mi Cuenta" onClose={onClose}>
      <div style={{ marginBottom: 18 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "datos", label: "Mis datos" },
            { id: "password", label: "Contraseña" }
          ]}
        />
      </div>

      {tab === "datos" && <SeccionDatos user={user} profile={profile} refreshProfile={refreshProfile} />}
      {tab === "password" && <SeccionPassword actualizarPassword={actualizarPassword} onClose={onClose} />}
    </Modal>
  );
}

/* ------------------------------------------------------------
   Sección: datos personales + foto
   ------------------------------------------------------------ */
function SeccionDatos({ user, profile, refreshProfile }) {
  const [nombre, setNombre] = useState(profile?.nombre || "");
  const [apellido, setApellido] = useState(profile?.apellido || "");
  const [fechaNacimiento, setFechaNacimiento] = useState(profile?.fecha_nacimiento || "");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  React.useEffect(() => {
    if (profile?.avatar_path) {
      getAdjuntoUrl(profile.avatar_path).then(setAvatarUrl).catch(() => setAvatarUrl(null));
    }
  }, [profile?.avatar_path]);

  const subirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setSubiendoFoto(true);
    setMsg(null);
    try {
      const subido = await uploadAdjunto(archivo);
      await actualizarMiPerfil(user.id, { avatar_path: subido.path });
      const url = await getAdjuntoUrl(subido.path);
      setAvatarUrl(url);
      await refreshProfile();
    } catch (err) {
      setMsg("No se pudo subir la foto. " + (err.message || ""));
    }
    setSubiendoFoto(false);
  };

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    try {
      await actualizarMiPerfil(user.id, {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fecha_nacimiento: fechaNacimiento || null
      });
      await refreshProfile();
      setMsg("✓ Guardado");
    } catch (err) {
      setMsg("No se pudo guardar: " + (err.message || ""));
    }
    setGuardando(false);
  };

  const iniciales = (nombre || profile?.email || "?").charAt(0).toUpperCase();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 999, overflow: "hidden",
            background: C.greenSoft, color: C.greenDk, display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : iniciales}
          </div>
          <label style={{
            position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: 999,
            background: C.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: subiendoFoto ? "wait" : "pointer", border: `2px solid ${C.surface}`
          }}>
            {subiendoFoto ? <Loader2 size={12} className="cad-spin" /> : <Camera size={12} />}
            <input type="file" accept="image/*" onChange={subirFoto} disabled={subiendoFoto} style={{ display: "none" }} />
          </label>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{user?.email}</div>
          <div style={{ fontSize: 11.5, color: C.mut }}>Haz clic en la cámara para cambiar tu foto</div>
        </div>
      </div>

      {msg && (
        <div style={{ fontSize: 12.5, color: msg.startsWith("✓") ? C.verde : C.rojo, marginBottom: 14 }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Nombre">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Apellido">
          <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
        </Field>
      </div>

      <Field label="Fecha de nacimiento">
        <Input type="date" value={fechaNacimiento || ""} onChange={(e) => setFechaNacimiento(e.target.value)} />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Btn onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Sección: cambiar contraseña
   ------------------------------------------------------------ */
function SeccionPassword({ actualizarPassword, onClose }) {
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

  if (ok) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.verde, marginBottom: 8 }}>✓ Contraseña actualizada</div>
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 16 }}>La próxima vez que inicies sesión, usa la nueva.</div>
        <Btn onClick={onClose}>Listo</Btn>
      </div>
    );
  }

  return (
    <div>
      {msg && <div style={{ background: C.rojoSoft, color: C.rojo, padding: "9px 12px", borderRadius: 10, fontSize: 12.5, marginBottom: 14 }}>{msg}</div>}

      <Field label="Nueva contraseña">
        <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
      </Field>
      {pass.length > 0 && <ChecklistPassword password={pass} />}

      <Field label="Confirma la nueva contraseña">
        <Input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardar()} />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        <Btn onClick={guardar} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Btn>
      </div>
    </div>
  );
}
