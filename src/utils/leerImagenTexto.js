/* ============================================================
   LECTURA DE TEXTO DE IMAGEN (OCR, en el navegador)
   ------------------------------------------------------------
   Usa Tesseract.js para "leer" el texto de una foto o captura de
   pantalla (comprobantes de pago que no son PDF). Es más lento y
   menos preciso que leer un PDF de verdad — depende de qué tan
   nítida esté la imagen — por eso el resultado SIEMPRE se muestra
   al usuario para confirmar antes de guardar.
   ============================================================ */

let tesseractPromesa = null;

async function cargarTesseract() {
  if (!tesseractPromesa) {
    tesseractPromesa = import("tesseract.js");
  }
  return tesseractPromesa;
}

/**
 * @param {File} archivo - imagen (PNG/JPG) del comprobante
 * @param {(progreso: number) => void} [onProgreso] - 0 a 1
 * @returns {Promise<string>}
 */
export async function extraerTextoImagen(archivo, onProgreso) {
  const { createWorker } = await cargarTesseract();
  const worker = await createWorker(["spa", "eng"], undefined, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgreso) onProgreso(m.progress);
    }
  });
  try {
    const { data } = await worker.recognize(archivo);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}
