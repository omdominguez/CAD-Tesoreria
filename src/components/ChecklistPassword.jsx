import React from "react";
import { Check, X } from "lucide-react";
import { C } from "../constants/theme";
import { evaluarPassword } from "../utils/validarPassword";

/** Lista visual de requisitos de contraseña, marcando cuáles ya se cumplen. */
export function ChecklistPassword({ password }) {
  const reglas = evaluarPassword(password);
  return (
    <div style={{ display: "grid", gap: 4, marginBottom: 12, marginTop: -4 }}>
      {reglas.map((r) => (
        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: r.ok ? C.verde : C.mut }}>
          {r.ok ? <Check size={12} /> : <X size={12} />}
          {r.label}
        </div>
      ))}
    </div>
  );
}
