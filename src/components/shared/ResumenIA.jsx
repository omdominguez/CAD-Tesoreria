import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { resumirConIA } from "../../utils/iaCliente";
import { Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";

/**
 * Botón "Generar resumen con IA" + área donde se muestra el párrafo
 * ejecutivo generado. Recibe los datos YA CALCULADOS del reporte (no
 * datos crudos) — la IA solo redacta en prosa lo que el sistema ya sabe,
 * no inventa ni recalcula nada.
 */
export default function ResumenIA({ datos, titulo }) {
  const [texto, setTexto] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const generar = async () => {
    setCargando(true);
    setError(null);
    const r = await resumirConIA(datos, titulo);
    if (r.ok) setTexto(r.texto);
    else setError(r.error);
    setCargando(false);
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <Btn small variant="ghost" onClick={generar} disabled={cargando}>
        {cargando ? <Loader2 size={13} className="cad-spin" /> : <Sparkles size={13} />}
        {texto ? "Regenerar resumen con IA" : "Generar resumen con IA"}
      </Btn>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: C.rojo }}>{error}</div>
      )}

      {texto && (
        <Card style={{ padding: 16, marginTop: 10, borderLeft: `3px solid ${C.gold}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Sparkles size={12} color={C.gold} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>Resumen generado por IA</span>
          </div>
          <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, fontFamily: FONTS.SANS }}>{texto}</div>
        </Card>
      )}
    </div>
  );
}
