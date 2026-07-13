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

/**
 * PDF formal de una corrida de pago — pensado para reemplazar el papel
 * físico de "Anticipo a Proveedores" que se firmaba a mano: mismo
 * espíritu (proveedor, monto, banco, descripción, quién ejecuta y
 * quién autoriza) pero generado y archivado digitalmente.
 */
export async function exportarCorridaPDF(corrida, items, opciones = {}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  const VERDE = [20, 83, 43];
  const GRIS = [120, 120, 120];
  let y = 18;

  doc.setFontSize(18);
  doc.setTextColor(...VERDE);
  doc.text("El Maizalito · CAD Venezuela", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Comercializadora Agrícola Domínguez, C.A. · RIF J-30386970-0", 14, y);
  y += 12;

  doc.setDrawColor(...VERDE);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text(`Corrida de Pago ${corrida.codigo}`, 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  doc.text(`Fecha de la solicitud: ${opciones.fechaCreacionFmt || corrida.fechaCreacion || ""}`, 14, y);
  doc.text(`Estado: ${opciones.estadoLbl || corrida.estado}`, 130, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [["Proveedor", "Concepto", "Banco", "Monto (Bs)"]],
    body: items.map((it) => [it.proveedor, it.concepto, it.banco, it.montoFmt]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: VERDE },
    alternateRowStyles: { fillColor: [247, 248, 243] },
    foot: [["", "", "Total", opciones.totalFmt || ""]],
    footStyles: { fillColor: [235, 237, 228], textColor: 20, fontStyle: "bold" }
  });

  y = doc.lastAutoTable.finY + 24;

  const col1 = 14, col2 = 110;
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);

  doc.text("Ejecutado por (Compras):", col1, y);
  doc.text(opciones.creadoPor || "—", col1, y + 6);
  doc.setDrawColor(180);
  doc.line(col1, y + 9, col1 + 78, y + 9);

  doc.text("Autorizado por (Gerencia):", col2, y);
  doc.text(opciones.autorizadoPor || "— pendiente —", col2, y + 6);
  doc.line(col2, y + 9, col2 + 78, y + 9);

  y += 22;
  doc.text("Ejecutado en Tesorería por:", col1, y);
  doc.text(opciones.ejecutadoPor || "— pendiente —", col1, y + 6);
  doc.line(col1, y + 9, col1 + 78, y + 9);

  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Documento generado digitalmente el ${new Date().toLocaleDateString("es-VE")} — CAD Tesorería`, 14, 285);

  doc.save(`${corrida.codigo}.pdf`);
}
