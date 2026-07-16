import React, { useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { C, FONTS, UI } from "../../constants/theme";
import { extraerTextoPDF } from "../../utils/leerPdfTexto";
import { parsearDocumentoOdoo, buscarContactoPorRif } from "../../utils/parsearDocumentoOdoo";
import { useArrastrarArchivo } from "../../hooks/useArrastrarArchivo";

/**
 * Botón para adjuntar el PDF de un pedido de compra o factura de Odoo:
 * lee el archivo, intenta identificar número, contraparte, monto y
 * fecha, y le pasa el resultado al formulario padre para que
 * pre-llene los campos (el usuario siempre revisa antes de guardar).
 *
 * @param contactos - lista de proveedores/clientes contra la que se busca por RIF
 * @param onDatos(datos, contactoEncontrado) - callback con el resultado
 */
export function AdjuntarPdfOdoo({ contactos, onDatos, label = "Adjuntar PDF del pedido (autocompletar)" }) {
  const [estado, setEstado] = useState("inicial"); // 'inicial' | 'leyendo' | 'ok' | 'error'
  const [resumen, setResumen] = useState(null);

  const procesarArchivo = async (archivo) => {
    if (!archivo) return;

    setEstado("leyendo");
    setResumen(null);
    try {
      const texto = await extraerTextoPDF(archivo);
      const datos = parsearDocumentoOdoo(texto);
      const contacto = datos.rif ? buscarContactoPorRif(contactos, datos.rif) : null;

      setResumen({ datos, contacto });
      setEstado(datos.numeroDocumento || datos.monto ? "ok" : "error");
      onDatos(datos, contacto);
    } catch (err) {
      console.warn("No se pudo leer el PDF:", err);
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
        {estado === "leyendo" ? "Leyendo el PDF…" : arrastrando ? "Suelta aquí para leer el PDF" : label}
        <input type="file" accept="application/pdf" onChange={procesar} disabled={estado === "leyendo"} style={{ display: "none" }} />
      </label>

      {estado === "ok" && resumen && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: C.greenSoft, fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <CheckCircle2 size={15} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ color: C.greenDk, fontWeight: 700 }}>
                Detectado: {resumen.datos.tipoDocumento || "Documento"} {resumen.datos.numeroDocumento || ""}
              </div>
              <div style={{ color: C.ink, marginTop: 2 }}>
                {resumen.contacto ? (
                  <>Contraparte encontrada en tu sistema: <b>{resumen.contacto.razonSocial}</b></>
                ) : resumen.datos.nombreContraparte ? (
                  <>
                    <b>{resumen.datos.nombreContraparte}</b> (RIF {resumen.datos.rif || "no detectado"}) no está en tu sistema —
                    créalo para poder asociarlo a este documento.
                  </>
                ) : (
                  "No se pudo identificar la contraparte — selecciónala manualmente."
                )}
              </div>
              {resumen.datos.baseImponible != null && resumen.datos.impuestos != null && (
                <div style={{ color: C.greenDk, marginTop: 4 }}>
                  Base imponible <b>${resumen.datos.baseImponible.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</b> + IVA{" "}
                  <b>${resumen.datos.impuestos.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</b> detectados y separados automáticamente.
                </div>
              )}
              {resumen.datos.advertencias.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: C.mut }}>
                  {resumen.datos.advertencias.map((a, i) => <li key={i}>{a}</li>)}
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
          No se pudo leer este PDF automáticamente. Puedes seguir llenando el formulario a mano.
        </div>
      )}
    </div>
  );
}
