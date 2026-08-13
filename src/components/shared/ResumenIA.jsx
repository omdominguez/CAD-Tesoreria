import React, { useState } from "react";
import { Sparkles, Loader2, Download } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { resumirConIA } from "../../utils/iaCliente";
import { exportarInformeIA } from "../../utils/exportar";
import { Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";

/**
 * Botón "Generar resumen con IA" + área donde se muestra el párrafo
 * ejecutivo generado, con un botón para descargarlo como PDF con la
 * identidad de marca de CAD. La IA solo redacta el párrafo (a partir de
 * datos YA CALCULADOS, no crudos); el PDF —logo, tablas, colores— lo
 * arma el sistema con lo que ya sabe hacer, no la IA.
 *
 * @param tablasPdf   opcional — [{ titulo, columnas, filas, colorEncabezado? }]
 *                    que se incluyen debajo del párrafo al descargar el PDF.
 * @param nombreArchivo opcional — nombre del archivo PDF sin extensión.
 */
export default function ResumenIA({ datos, titulo, tablasPdf, nombreArchivo }) {
  const [texto, setTexto] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const generar = async () => {
    setCargando(true);
    setError(null);
    const r = await resumirConIA(datos, titulo);
    if (r.ok) setTexto(r.texto);
    else setError(r.error);
    setCargando(false);
  };

  const descargarPDF = async () => {
    setDescargando(true);
    try {
      const archivo = nombreArchivo || (titulo || "informe").toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await exportarInformeIA(titulo || "Informe", texto, tablasPdf || [], archivo);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn small variant="ghost" onClick={generar} disabled={cargando}>
          {cargando ? <Loader2 size={13} className="cad-spin" /> : <Sparkles size={13} />}
          {texto ? "Regenerar resumen con IA" : "Generar resumen con IA"}
        </Btn>

        {texto && (
          <Btn small variant="ghost" onClick={descargarPDF} disabled={descargando}>
            {descargando ? <Loader2 size={13} className="cad-spin" /> : <Download size={13} />}
            Descargar PDF
          </Btn>
        )}
      </div>

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
