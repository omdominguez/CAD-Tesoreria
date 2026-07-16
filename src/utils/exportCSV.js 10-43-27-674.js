/* ============================================================
   EXPORTACIÓN A CSV
   ------------------------------------------------------------
   Genera un archivo .csv en el navegador (sin depender de ninguna
   librería) y dispara su descarga. Se abre directo en Excel/Google
   Sheets. Incluye BOM de UTF-8 para que las tildes y la "ñ" se vean
   bien al abrirlo en Excel en Windows.
   ============================================================ */

function escaparCelda(valor) {
  const s = valor === null || valor === undefined ? "" : String(valor);
  // Si contiene comas, comillas o saltos de línea, hay que envolver en comillas
  if (/[",\n;]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * @param {string} nombreArchivo - sin extensión, ej. "estado_de_cuenta_acme"
 * @param {{key: string, label: string}[]} columnas - columnas a exportar, en orden
 * @param {object[]} filas - los datos; cada fila es un objeto con esas keys
 */
export function exportarCSV(nombreArchivo, columnas, filas) {
  const encabezado = columnas.map((c) => escaparCelda(c.label)).join(";");
  const cuerpo = filas
    .map((fila) => columnas.map((c) => escaparCelda(fila[c.key])).join(";"))
    .join("\n");

  const contenido = "\uFEFF" + encabezado + "\n" + cuerpo; // \uFEFF = BOM UTF-8
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}