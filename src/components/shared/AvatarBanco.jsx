import React, { useState } from "react";
import { C } from "../../constants/theme";
import { logosDeBanco } from "../../utils/bancoLogos";

/** Avatar circular/redondeado del banco: recorre la cadena de fuentes de logo → iniciales. */
export function AvatarBanco({ nombre, tamano = 36 }) {
  const candidatos = logosDeBanco(nombre);
  const [indice, setIndice] = useState(0);
  const iniciales = (nombre || "??").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  const logoUrl = indice < candidatos.length ? candidatos[indice] : null;
  const radio = Math.round(tamano * 0.28);

  if (logoUrl) {
    return (
      <div style={{ width: tamano, height: tamano, borderRadius: radio, background: "#fff", border: `1px solid ${C.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
        <img
          key={logoUrl}
          src={logoUrl}
          alt=""
          onError={() => setIndice((i) => i + 1)}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: Math.round(tamano * 0.16) }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: tamano, height: tamano, borderRadius: radio, background: C.greenSoft, color: C.greenDk, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(tamano * 0.36), fontWeight: 800, flexShrink: 0 }}>
      {iniciales}
    </div>
  );
}
