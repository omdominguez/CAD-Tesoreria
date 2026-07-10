import React, { useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";
import { extraerTextoPDF } from "../../utils/leerPdfTexto";
import { extraerTextoImagen } from "../../utils/leerImagenTexto";
import { parsearComprobantePago } from "../../utils/parsearComprobantePago";
import { useArrastrarArchivo } from "../../hooks/useArrastrarArchivo";

/**
 * Botón para adjuntar el comprobante de pago que envía el cliente
 * (PDF o foto/captura de pantalla) e intentar identificar el monto
 * y la fecha del pago. Como cada banco/método tiene su propio
 * formato, la lectura es genérica (no apunta a un banco específico)
 * y siempre hay que confirmar el resultado antes de guardar.
 */
export function AdjuntarComprobante({ onDatos, label = "Adjuntar comprobante (PDF o foto) — autocompletar" }) {
  const [estado, setEstado] = useState("inicial"); // 'inicial' | 'leyendo' | 'ok' | 'error'
  const [progreso, setProgreso] = useState(0);
  const [resumen, setResumen] = useState(null);

  const procesarArchivo = async (archivo) => {
    if (!archivo) return;

    setEstado("leyendo");
    setProgreso(0);
    setResumen(null);
    try {
      const esPDF = archivo.type === "application/pdf";
      const texto = esPDF
        ? await extraerTextoPDF(archivo)
        : await extraerTextoImagen(archivo, setProgreso);

      const datos = parsearComprobantePago(texto);
      setResumen(datos);
      setEstado(datos.monto || datos.fecha ? "ok" : "error");
      onDatos(datos, archivo);
    } catch (err) {
      console.warn("No se pudo leer el comprobante:", err);
      setResumen(null);
      setEstado("error");
    }
  };

  const procesar = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    procesarArchivo(archivo);
  };

  const { arrastrando, dragProps } = useArrastrarArchivo(
    (files) => procesarArchivo(files[0]),
    estado === "leyendo"
  );

  return (
    <div style={{ marginBottom: 16 }}>
      <label
        {...dragProps}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          border: `1.5px dashed ${arrastrando ? C.green : C.line}`,
          borderRadius: UI.RADIUS_SM,
          cursor: estado === "leyendo" ? "wait" : "pointer",
          color: C.greenDk,
          background: arrastrando ? C.greenSoft : C.paper,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: FONTS.SANS,
          transition: "background-color .12s, border-color .12s"
        }}
      >
        {estado === "leyendo" ? <Loader2 size={15} className="cad-spin" /> : <FileUp size={15} />}
        {estado === "leyendo" ? `Leyendo… ${progreso > 0 ? Math.round(progreso * 100) + "%" : ""}` : arrastrando ? "Suelta aquí para leer el comprobante" : label}
        <input type="file" accept="application/pdf,image/*" onChange={procesar} disabled={estado === "leyendo"} style={{ display: "none" }} />
      </label>

      {estado === "ok" && resumen && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: C.greenSoft, fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <CheckCircle2 size={15} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ color: C.greenDk, fontWeight: 700 }}>
                {resumen.monto ? `Monto detectado: ${resumen.moneda === "BS" ? "Bs" : "$"} ${resumen.monto}` : "No se detectó un monto claro"}
                {resumen.fecha ? ` · Fecha: ${resumen.fecha}` : ""}
              </div>
              {resumen.referencia && <div style={{ color: C.ink, marginTop: 2 }}>Referencia: {resumen.referencia}</div>}
              {resumen.advertencias.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: C.mut }}>
                  {resumen.advertencias.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
              <div style={{ color: C.mut, marginTop: 4, fontStyle: "italic" }}>
                Revisa los campos de abajo antes de guardar — la lectura automática puede tener errores.
              </div>
            </div>
          </div>
        </div>
      )}

      {estado === "error" && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, background: C.amarSoft, color: C.amar, fontSize: 12.5 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          No se pudo leer este comprobante automáticamente. Puedes seguir llenando el formulario a mano.
        </div>
      )}
    </div>
  );
}
