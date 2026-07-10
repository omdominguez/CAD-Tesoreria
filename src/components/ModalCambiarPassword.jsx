import React, { useState } from "react";
import { useAuth } from "../services/auth";
import { C, FONTS } from "../constants/theme";
import { Modal } from "./ui/Layout";
import { Field, Input } from "./ui/Forms";
import { Btn } from "./ui/Buttons";
import { ChecklistPassword } from "../components/ChecklistPassword.jsx";
import { passwordEsValida } from "../utils/validarPassword";

/** Modal para que cualquier usuario ya logueado cambie su propia contraseña. */
export function ModalCambiarPassword({ onClose }) {
  const { actualizarPassword } = useAuth();
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
    <Modal title="Cambiar mi contraseña" onClose={onClose}>
      {ok ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.verde, marginBottom: 8 }}>✓ Contraseña actualizada</div>
          <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 16 }}>La próxima vez que inicies sesión, usa la nueva.</div>
          <Btn onClick={onClose}>Listo</Btn>
        </div>
      ) : (
        <>
          {msg && <div style={{ background: C.rojoSoft, color: C.rojo, padding: "9px 12px", borderRadius: 10, fontSize: 12.5, marginBottom: 14 }}>{msg}</div>}

          <Field label="Nueva contraseña">
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </Field>
          {pass.length > 0 && <ChecklistPassword password={pass} />}

          <Field label="Confirma la nueva contraseña">
            <Input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && guardar()} />
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
            <Btn onClick={guardar} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
