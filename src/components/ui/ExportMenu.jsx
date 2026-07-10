import React, { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";
import { Btn } from "./Buttons";

const OPCIONES = [
  { id: "csv", label: "CSV (.csv)", desc: "Abre en Excel o Sheets", icon: Download },
  { id: "excel", label: "Excel (.xlsx)", desc: "Con formato de columnas", icon: FileSpreadsheet },
  { id: "pdf", label: "PDF (.pdf)", desc: "Para imprimir o compartir", icon: FileText }
];

/**
 * Botón "Exportar" con un menú desplegable para elegir CSV / Excel / PDF.
 * `onExport(formatoId)` se llama al elegir una opción; puede devolver
 * una Promise (se muestra un pequeño loader mientras se genera el archivo).
 */
export function ExportMenu({ onExport, disabled, label = "Exportar" }) {
  const [abierto, setAbierto] = useState(false);
  const [generando, setGenerando] = useState(null); // id del formato en curso
  const ref = useRef(null);

  useEffect(() => {
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const elegir = async (id) => {
    setGenerando(id);
    try {
      await onExport(id);
    } finally {
      setGenerando(null);
      setAbierto(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <Btn small variant="ghost" onClick={() => setAbierto((a) => !a)} disabled={disabled || Boolean(generando)}>
        {generando ? <Loader2 size={13} className="cad-spin" /> : <Download size={13} />}
        {generando ? "Generando…" : label} <ChevronDown size={13} />
      </Btn>

      {abierto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 30,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: UI.RADIUS_SM,
            boxShadow: UI.SHADOW_MODAL,
            minWidth: 210,
            overflow: "hidden"
          }}
        >
          {OPCIONES.map((o) => (
            <button
              key={o.id}
              onClick={() => elegir(o.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 12px",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${C.line}`,
                cursor: "pointer",
                textAlign: "left",
                fontFamily: FONTS.SANS
              }}
              className="cad-sidebar-item"
            >
              <o.icon size={15} color={C.mut} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{o.label}</div>
                <div style={{ fontSize: 10.5, color: C.mut }}>{o.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}