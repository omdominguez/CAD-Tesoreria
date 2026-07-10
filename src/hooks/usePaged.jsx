import { useState, useEffect } from "react";

/**
 * Hook de paginación. Las propiedades devueltas (total, perPage,
 * setPerPage, pages, page, setPage) coinciden a propósito con lo que
 * espera el componente <Pagination />, para que nunca se desincronicen.
 */
export function usePaged(lista = [], porPaginaInicial = 10) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(porPaginaInicial);

  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));

  // Si la lista se achica (por un filtro, o al cambiar cuántos por página)
  // y la página actual quedó "flotando" más allá del final, la corregimos.
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const paginaSegura = Math.min(pagina, totalPaginas);
  const slice = lista.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina);

  return {
    slice,
    page: paginaSegura,
    pages: totalPaginas,
    total,
    perPage: porPagina,
    setPerPage: setPorPagina,
    setPage: setPagina,
    next: () => setPagina((p) => Math.min(p + 1, totalPaginas)),
    prev: () => setPagina((p) => Math.max(p - 1, 1))
  };
}