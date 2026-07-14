import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";

/**
 * Selector con buscador: escribes y la lista de opciones se va acortando,
 * en vez de desplazarte por un <select> largo. Pensado para listas de
 * bancos, proveedores o clientes cuando hay muchos.
 *
 * @param {Array<{value: string, label: string, sublabel?: string}>} options
 * @param {string} value - el value seleccionado actualmente
 * @param {(value: string) => void} onChange
 * @param {string} placeholder
 */
export function ComboBox({ options, value, onChange, placeholder = "Buscar...", disabled }) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  const seleccionado = options.find((o) => o.value === value);

  useEffect(() => {
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) { setAbierto(false); setTexto(""); } };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const filtradas = texto.trim()
    ? options.filter((o) => `${o.label} ${o.sublabel || ""}`.toLowerCase().includes(texto.trim().toLowerCase()))
    : options;

  const elegir = (opt) => {
    onChange(opt.value);
    setAbierto(false);
    setTexto("");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setAbierto((a) => !a); setTimeout(() => inputRef.current?.focus(), 0); }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "9px 12px",
          border: `1px solid ${C.line}`,
          borderRadius: UI.RADIUS_SM,
          background: disabled ? C.body : C.surface,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 13.5,
          fontFamily: FONTS.SANS,
          color: seleccionado ? C.ink : C.mut,
          textAlign: "left"
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {seleccionado ? seleccionado.label : placeholder}
        </span>
        <ChevronDown size={14} color={C.mut} style={{ flexShrink: 0 }} />
      </button>

      {abierto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 40,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: UI.RADIUS_SM,
            boxShadow: "0 12px 28px rgba(0,0,0,0.14)",
            overflow: "hidden"
          }}
        >
          <div style={{ position: "relative", borderBottom: `1px solid ${C.line}` }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: C.mut }} />
            <input
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe para buscar..."
              style={{
                width: "100%",
                padding: "9px 12px 9px 30px",
                border: "none",
                outline: "none",
                fontSize: 13.5,
                fontFamily: FONTS.SANS,
                background: "transparent",
                color: C.ink
              }}
            />
            {texto && (
              <button
                onClick={() => setTexto("")}
                style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", cursor: "pointer", color: C.mut }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 12.5, color: C.mut, textAlign: "center" }}>
                Sin resultados.
              </div>
            ) : (
              filtradas.map((o) => (
                <div
                  key={o.value}
                  onClick={() => elegir(o)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 13,
                    background: o.value === value ? C.greenSoft : "transparent",
                    color: C.ink
                  }}
                  onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = C.body; }}
                  onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{ fontWeight: 600 }}>{o.label}</div>
                  {o.sublabel && <div style={{ fontSize: 11, color: C.mut }}>{o.sublabel}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
