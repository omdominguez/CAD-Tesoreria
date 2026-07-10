import { nombreFeriado as feriadoVE, esFinDeSemana } from "./feriadosVenezuela";
import { nombreFeriado as feriadoUS } from "./feriadosUSA";
import { nombreFeriado as feriadoPA } from "./feriadosPanama";

export const PAISES = {
  VE: { etiqueta: "Venezuela", bandera: "🇻🇪", color: "#A9740A" },
  US: { etiqueta: "Estados Unidos", bandera: "🇺🇸", color: "#1D4ED8" },
  PA: { etiqueta: "Panamá", bandera: "🇵🇦", color: "#9333EA" }
};

/** Feriados de los tres países para una fecha (YYYY-MM-DD): [{pais, nombre}]. */
export function feriadosDeFecha(fechaStr) {
  const lista = [];
  const ve = feriadoVE(fechaStr); if (ve) lista.push({ pais: "VE", nombre: ve });
  const us = feriadoUS(fechaStr); if (us) lista.push({ pais: "US", nombre: us });
  const pa = feriadoPA(fechaStr); if (pa) lista.push({ pais: "PA", nombre: pa });
  return lista;
}

export { esFinDeSemana };
