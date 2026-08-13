import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { construirResumenFinanciero } from "../../utils/resumenFinanciero";
import { preguntarIA } from "../../utils/iaCliente";

/**
 * Botón flotante (abajo a la derecha) que abre un chat para hacer
 * preguntas en lenguaje natural sobre las finanzas de la empresa. Cada
 * pregunta se manda junto con un resumen curado de los datos reales
 * (utils/resumenFinanciero.js) — no el estado completo — para que la IA
 * responda con datos reales sin exponer todo el detalle línea por línea.
 */
export default function AsistenteIA({ st }) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([
    { rol: "ia", texto: "Hola, soy el asistente de CAD-Tesorería. Puedes preguntarme cosas como \"¿cuánto le debemos a Maploca?\" o \"¿cuál es la posición neta hoy?\"." }
  ]);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const finRef = useRef(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto]);

  const enviar = async () => {
    const texto = pregunta.trim();
    if (!texto || cargando) return;
    setMensajes((prev) => [...prev, { rol: "usuario", texto }]);
    setPregunta("");
    setCargando(true);

    const resumen = construirResumenFinanciero(st);
    const r = await preguntarIA(texto, resumen);

    setMensajes((prev) => [
      ...prev,
      r.ok ? { rol: "ia", texto: r.texto } : { rol: "error", texto: r.error }
    ]);
    setCargando(false);
  };

  return (
    <>
      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 60,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: C.gold, color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.22)"
        }}
        title="Preguntar al asistente de IA"
      >
        {abierto ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {abierto && (
        <div
          style={{
            position: "fixed", bottom: 86, right: 22, zIndex: 60,
            width: 360, maxHeight: 480, display: "flex", flexDirection: "column",
            background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`,
            boxShadow: "0 20px 50px rgba(0,0,0,0.25)", overflow: "hidden"
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={15} color={C.gold} />
            <span style={{ fontFamily: FONTS.SANS, fontWeight: 700, fontSize: 13.5, color: C.ink }}>Asistente CAD-Tesorería</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {mensajes.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.rol === "usuario" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 12.8,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  background: m.rol === "usuario" ? C.navy : m.rol === "error" ? C.rojoSoft : C.body,
                  color: m.rol === "usuario" ? "#fff" : m.rol === "error" ? C.rojo : C.ink
                }}
              >
                {m.texto}
              </div>
            ))}
            {cargando && (
              <div style={{ alignSelf: "flex-start", padding: "8px 12px", color: C.mut, fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={13} className="cad-spin" /> Pensando…
              </div>
            )}
            <div ref={finRef} />
          </div>

          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: `1px solid ${C.line}` }}>
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Preguntar algo…"
              style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 12.8, outline: "none" }}
            />
            <button
              onClick={enviar}
              disabled={cargando || !pregunta.trim()}
              style={{ width: 36, borderRadius: 10, border: "none", background: C.gold, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: cargando || !pregunta.trim() ? 0.5 : 1 }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
