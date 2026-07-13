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

  const NAVY = [1, 45, 55]; // CAD Navy #012D37 (institucional)
  const VERDE = [0, 135, 71]; // Verde agro CAD #008747
  const GRIS = [120, 120, 120];
  let y = 18;

  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("El Maizalito · CAD Venezuela", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Comercializadora Agrícola Domínguez, C.A. · RIF J-30386970-0", 14, y);
  y += 12;

  doc.setDrawColor(...NAVY);
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

/** PDF del resumen financiero mensual — KPIs arriba, tablas de detalle abajo. */
export async function exportarReporteMensualPDF(reporte) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();

  const NAVY = [1, 45, 55]; // CAD Navy #012D37 (institucional)
  const VERDE = [0, 135, 71]; // Verde agro CAD #008747
  const GRIS = [120, 120, 120];
  const fmt = (n) => "$ " + Number(n || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let y = 18;

  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("El Maizalito · CAD Venezuela", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Comercializadora Agrícola Domínguez, C.A. · RIF J-30386970-0", 14, y);
  y += 12;

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setFontSize(15);
  doc.setTextColor(20, 20, 20);
  doc.text(`Resumen Financiero — ${reporte.etiqueta}`, 14, y);
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [["", "Cantidad", "Total (USD)"]],
    body: [
      ["Compras registradas", reporte.compras.cantidad, fmt(reporte.compras.totalUSD)],
      ["Pagos realizados", reporte.pagos.cantidad, fmt(reporte.pagos.totalUSD)],
      ["Facturas de venta", reporte.ventas.cantidad, fmt(reporte.ventas.totalUSD)],
      ["Cobros recibidos", reporte.cobros.cantidad, fmt(reporte.cobros.totalUSD)],
    ],
    foot: [["Balance neto del mes (cobros − pagos)", "", fmt(reporte.balanceNeto)]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: VERDE },
    footStyles: { fillColor: [235, 237, 228], textColor: 20, fontStyle: "bold" }
  });
  y = doc.lastAutoTable.finY + 14;

  if (reporte.porCategoria.length) {
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("Compras por categoría", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y + 2,
      head: [["Categoría", "Total (USD)"]],
      body: reporte.porCategoria.map((c) => [c.categoria, fmt(c.totalUSD)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [100, 100, 100] },
    });
    y = doc.lastAutoTable.finY + 14;
  }

  if (y > 230) { doc.addPage(); y = 20; }

  if (reporte.topProveedores.length) {
    doc.setFontSize(11);
    doc.text("Proveedores más pagados", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y + 2,
      head: [["Proveedor", "Total pagado (USD)"]],
      body: reporte.topProveedores.map((p) => [p.nombre, fmt(p.totalUSD)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [166, 115, 10] },
    });
    y = doc.lastAutoTable.finY + 14;
  }

  if (y > 250) { doc.addPage(); y = 20; }

  if (reporte.topClientes.length) {
    doc.setFontSize(11);
    doc.text("Clientes que más pagaron", 14, y);
    y += 4;
    autoTable(doc, {
      startY: y + 2,
      head: [["Cliente", "Total cobrado (USD)"]],
      body: reporte.topClientes.map((c) => [c.nombre, fmt(c.totalUSD)]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: VERDE },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Generado digitalmente el ${new Date().toLocaleDateString("es-VE")} — CAD Tesorería`, 14, 290);

  doc.save(`resumen_${reporte.etiqueta.replace(" ", "_").toLowerCase()}.pdf`);
}

/** Excel multi-hoja del resumen financiero mensual. */
export async function exportarReporteMensualExcel(reporte) {
  const XLSX = await import("xlsx");
  const libro = XLSX.utils.book_new();

  const resumen = [
    { Concepto: "Compras registradas", Cantidad: reporte.compras.cantidad, "Total (USD)": reporte.compras.totalUSD },
    { Concepto: "Pagos realizados", Cantidad: reporte.pagos.cantidad, "Total (USD)": reporte.pagos.totalUSD },
    { Concepto: "Facturas de venta", Cantidad: reporte.ventas.cantidad, "Total (USD)": reporte.ventas.totalUSD },
    { Concepto: "Cobros recibidos", Cantidad: reporte.cobros.cantidad, "Total (USD)": reporte.cobros.totalUSD },
    { Concepto: "Balance neto (cobros − pagos)", Cantidad: "", "Total (USD)": reporte.balanceNeto },
  ];
  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  hojaResumen["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");

  if (reporte.porCategoria.length) {
    const hoja = XLSX.utils.json_to_sheet(reporte.porCategoria.map((c) => ({ Categoría: c.categoria, "Total (USD)": c.totalUSD })));
    hoja["!cols"] = [{ wch: 24 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(libro, hoja, "Compras por categoría");
  }

  if (reporte.topProveedores.length) {
    const hoja = XLSX.utils.json_to_sheet(reporte.topProveedores.map((p) => ({ Proveedor: p.nombre, "Total pagado (USD)": p.totalUSD })));
    hoja["!cols"] = [{ wch: 28 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(libro, hoja, "Top proveedores");
  }

  if (reporte.topClientes.length) {
    const hoja = XLSX.utils.json_to_sheet(reporte.topClientes.map((c) => ({ Cliente: c.nombre, "Total cobrado (USD)": c.totalUSD })));
    hoja["!cols"] = [{ wch: 28 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(libro, hoja, "Top clientes");
  }

  XLSX.writeFile(libro, `resumen_${reporte.etiqueta.replace(" ", "_").toLowerCase()}.xlsx`);
}
