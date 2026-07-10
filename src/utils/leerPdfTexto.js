/* ============================================================
   LECTURA DE TEXTO DE PDF (en el navegador)
   ------------------------------------------------------------
   Usa pdf.js (la misma librería que usa Firefox/Chrome para ver
   PDFs) para extraer el texto de un archivo PDF sin necesidad de
   ningún servidor. Se carga solo cuando hace falta (no infla el
   paquete principal de la app).
   ============================================================ */

let pdfjsPromesa = null;

async function cargarPdfjs() {
  if (!pdfjsPromesa) {
    pdfjsPromesa = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url);
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.toString();
      return pdfjs;
    })();
  }
  return pdfjsPromesa;
}

/**
 * Extrae el texto completo de un archivo PDF (todas sus páginas,
 * separadas por salto de línea).
 * @param {File} archivo
 * @returns {Promise<string>}
 */
export async function extraerTextoPDF(archivo) {
  const pdfjs = await cargarPdfjs();
  const bytes = await archivo.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: bytes }).promise;

  let textoCompleto = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const contenido = await pagina.getTextContent();
    const items = contenido.items.map((it) => ({
      texto: it.str,
      x: it.transform[4],
      y: Math.round(it.transform[5])
    }));
    const porLinea = {};
    items.forEach((it) => {
      if (!porLinea[it.y]) porLinea[it.y] = [];
      porLinea[it.y].push(it);
    });
    const filasY = Object.keys(porLinea).map(Number).sort((a, b) => b - a);
    const filas = filasY.map((y) => porLinea[y].sort((a, b) => a.x - b.x));

    // Reconstruye números partidos entre filas por el ajuste de una celda de
    // tabla: si una celda termina en "separador+1 dígito" (p. ej. "18.207.920,0")
    // y en la fila siguiente hay un fragmento corto en la MISMA posición
    // horizontal (p. ej. "0"), lo más probable es que sea la continuación del
    // mismo número — se unen antes de convertir todo a texto plano.
    for (let f = 0; f < filas.length - 1; f++) {
      filas[f].forEach((item) => {
        if (!/[.,]\d$/.test(item.texto)) return;
        const filaSiguiente = filas[f + 1];
        const idx = filaSiguiente.findIndex((otro) => Math.abs(otro.x - item.x) < 4 && /^\d{1,2}$/.test(otro.texto));
        if (idx !== -1) {
          item.texto += filaSiguiente[idx].texto;
          filaSiguiente.splice(idx, 1);
        }
      });
    }

    const lineas = filas.map((fila) => fila.map((it) => it.texto).join(" "));
    textoCompleto += lineas.join("\n") + "\n";
  }
  return textoCompleto;
}
