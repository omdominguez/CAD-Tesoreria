import { useState, useCallback } from "react";

/**
 * Agrega soporte de "arrastrar y soltar" a cualquier zona de carga de
 * archivos. Devuelve `arrastrando` (para el estilo visual mientras el
 * archivo está encima) y `dragProps` (para poner directo en el elemento
 * que hace de zona de destino).
 *
 * @param {(files: FileList) => void} onArchivos - se llama con los archivos soltados
 * @param {boolean} [deshabilitado] - ignora el drop mientras es true (ej. si ya está subiendo algo)
 */
export function useArrastrarArchivo(onArchivos, deshabilitado = false) {
  const [arrastrando, setArrastrando] = useState(false);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!deshabilitado) setArrastrando(true);
  }, [deshabilitado]);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    if (deshabilitado) return;
    const archivos = e.dataTransfer?.files;
    if (archivos && archivos.length) onArchivos(archivos);
  }, [onArchivos, deshabilitado]);

  return {
    arrastrando,
    dragProps: { onDragOver, onDragEnter: onDragOver, onDragLeave, onDrop }
  };
}
