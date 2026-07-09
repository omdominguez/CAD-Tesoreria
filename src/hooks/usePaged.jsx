import { useState } from "react";

export function usePaged(lista = [], porPagina = 10) {
  const [pagina, setPagina] = useState(1);

  // Calcular el total de páginas necesarias
  const totalPaginas = Math.ceil(lista.length / porPagina) || 1;

  // Cortar el array para mostrar solo el segmento de la página actual
  const slice = lista.slice((pagina - 1) * porPagina, pagina * porPagina);

  // Asegurar que si la lista se achica por filtros, la página actual no quede flotando en el vacío
  if (pagina > totalPaginas && totalPaginas > 0) {
    setPagina(totalPaginas);
  }

  return {
    slice,
    page: pagina,
    totalPages: totalPaginas,
    next: () => setPagina((p) => Math.min(p + 1, totalPaginas)),
    prev: () => setPagina((p) => Math.max(p - 1, 1)),
    setPage: setPagina
  };
}