import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Leaf } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { construirResumenFinanciero } from "../../utils/resumenFinanciero";
import { preguntarIA } from "../../utils/iaCliente";

/**
 * Botón flotante (abajo a la derecha) que abre un chat para hacer
 * preguntas en lenguaje natural sobre las finanzas de la empresa. Cada
 * pregunta se manda junto con un resumen curado de los datos reales
 * (utils/resumenFinanciero.js) — no el estado completo — para que la IA
 * responda con datos reales sin exponer todo el detalle línea por línea.
 *
 * Diseño con la paleta de marca CAD: Navy como ancla (encabezado y
 * burbujas propias), verde agro y naranja energía como acentos.
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
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, abierto, cargando]);

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
      {/* Animaciones propias del widget: pulso del botón y puntos de "escribiendo" */}
      <style>{`
        @keyframes cadIaPulso {
          0%, 100% { box-shadow: 0 6px 20px rgba(1,45,55,0.28), 0 0 0 0 rgba(31,170,94,0.35); }
          50% { box-shadow: 0 6px 20px rgba(1,45,55,0.28), 0 0 0 8px rgba(31,170,94,0); }
        }
        @keyframes cadIaPunto {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes cadIaAparecer {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <button
        onClick={() => setAbierto((v) => !v)}
        style={{
          position: "fixed", bottom: 22, right: 22, zIndex: 60,
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: `linear-gradient(135deg, ${C.verde}, ${C.navy})`,
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: abierto ? "none" : "cadIaPulso 2.4s ease-in-out infinite",
          transition: "transform .15s ease"
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        title="Preguntar al asistente de IA"
      >
        {abierto ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {abierto && (
        <div
          style={{
            position: "fixed", bottom: 88, right: 22, zIndex: 60,
            width: 372, maxHeight: 500, display: "flex", flexDirection: "column",
            background: C.surface, borderRadius: 18, border: `1px solid ${C.line}`,
            boxShadow: "0 24px 60px rgba(1,45,55,0.22)", overflow: "hidden",
            animation: "cadIaAparecer .18s ease-out"
          }}
        >
          {/* Encabezado con degradado de marca */}
          <div
            style={{
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
              background: `linear-gradient(120deg, ${C.navy}, ${C.navySoft})`
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Leaf size={16} color={C.verde} strokeWidth={2.3} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONTS.SANS, fontWeight: 700, fontSize: 13.5, color: "#fff", letterSpacing: -0.1 }}>
                Asistente CAD-Tesorería
              </div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.62)", marginTop: 1 }}>
                Impulsado por IA · datos en vivo
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: C.body }}>
            {mensajes.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.rol === "usuario" ? "flex-end" : "flex-start",
                  maxWidth: "86%",
                  padding: "9px 13px",
                  fontSize: 12.8,
                  lineHeight: 1.48,
                  whiteSpace: "pre-wrap",
                  fontFamily: FONTS.SANS,
                  ...(m.rol === "usuario"
                    ? {
                        background: `linear-gradient(135deg, ${C.navy}, ${C.navySoft})`,
                        color: "#fff",
                        borderRadius: "14px 14px 3px 14px"
                      }
                    : m.rol === "error"
                    ? {
                        background: C.rojoSoft,
                        color: C.rojo,
                        borderRadius: "14px 14px 14px 3px",
                        border: `1px solid ${C.rojo}22`
                      }
                    : {
                        background: C.surface,
                        color: C.ink,
                        borderRadius: "14px 14px 14px 3px",
                        border: `1px solid ${C.line}`,
                        borderLeft: `3px solid ${C.verde}`
                      })
                }}
              >
                {m.texto}
              </div>
            ))}

            {cargando && (
              <div
                style={{
                  alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 5,
                  padding: "10px 14px", borderRadius: "14px 14px 14px 3px",
                  background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.gold}`
                }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      width: 6, height: 6, borderRadius: "50%", background: C.gold,
                      display: "inline-block", animation: `cadIaPunto 1.1s ease-in-out ${i * 0.15}s infinite`
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Entrada */}
          <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.line}`, background: C.surface }}>
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviar()}
              placeholder="Preguntar algo…"
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 999, border: `1px solid ${C.line}`,
                fontSize: 12.8, outline: "none", fontFamily: FONTS.SANS, background: C.body, color: C.ink
              }}
            />
            <button
              onClick={enviar}
              disabled={cargando || !pregunta.trim()}
              style={{
                width: 38, height: 38, borderRadius: "50%", border: "none",
                background: cargando || !pregunta.trim() ? C.line : `linear-gradient(135deg, ${C.gold}, ${C.verde})`,
                color: "#fff", cursor: cargando || !pregunta.trim() ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                transition: "opacity .15s"
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
