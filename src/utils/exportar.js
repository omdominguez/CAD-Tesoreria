/* ============================================================
   EXPORTACIÓN DE DATOS (CSV / Excel / PDF)
   ------------------------------------------------------------
   Tres formas de exportar la misma información, todas generadas
   en el navegador (sin backend) y descargadas directo al equipo.
   ============================================================ */

function escaparCeldaCSV(valor) {
  const s = valor === null || valor === undefined ? "" : String(valor);
  if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * @param {string} nombreArchivo - sin extensión
 * @param {{key: string, label: string}[]} columnas
 * @param {object[]} filas
 */
export function exportarCSV(nombreArchivo, columnas, filas) {
  const encabezado = columnas.map((c) => escaparCeldaCSV(c.label)).join(";");
  const cuerpo = filas.map((fila) => columnas.map((c) => escaparCeldaCSV(fila[c.key])).join(";")).join("\n");
  const contenido = "\uFEFF" + encabezado + "\n" + cuerpo; // BOM UTF-8 para tildes en Excel
  descargarBlob(new Blob([contenido], { type: "text/csv;charset=utf-8;" }), `${nombreArchivo}.csv`);
}

/** Excel real (.xlsx) usando SheetJS, cargado solo cuando se necesita (no infla el paquete principal). */
export async function exportarExcel(nombreArchivo, columnas, filas, tituloHoja = "Datos") {
  const XLSX = await import("xlsx");
  const datos = filas.map((fila) => {
    const obj = {};
    columnas.forEach((c) => { obj[c.label] = fila[c.key]; });
    return obj;
  });
  const hoja = XLSX.utils.json_to_sheet(datos);
  // Ancho de columnas aproximado según el contenido
  hoja["!cols"] = columnas.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, tituloHoja.slice(0, 31));
  XLSX.writeFile(libro, `${nombreArchivo}.xlsx`);
}

/** PDF con tabla, usando jsPDF + autotable, cargado solo cuando se necesita. */
export async function exportarPDF(nombreArchivo, columnas, filas, opciones = {}) {
  const { titulo = "Reporte", subtitulo = "" } = opciones;
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: columnas.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 16);
  if (subtitulo) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitulo, 14, 22);
  }

  autoTable(doc, {
    startY: subtitulo ? 27 : 22,
    head: [columnas.map((c) => c.label)],
    body: filas.map((fila) => columnas.map((c) => {
      const v = fila[c.key];
      return v === null || v === undefined ? "" : String(v);
    })),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [20, 83, 43] }, // verde de marca
    alternateRowStyles: { fillColor: [247, 248, 243] }
  });

  doc.save(`${nombreArchivo}.pdf`);
}