/* ============================================================
   FERIADOS BANCARIOS DE PANAMÁ
   ------------------------------------------------------------
   Incluye los feriados nacionales fijos y los que dependen de la
   Pascua (Martes de Carnaval, Viernes Santo).

   IMPORTANTE: la Superintendencia de Bancos de Panamá publica su
   propio calendario anual de días no laborables bancarios, que
   puede incluir ajustes puntuales — esta lista cubre el calendario
   estándar conocido.
   ============================================================ */
import { calcularPascua, sumarDias, ymd } from "./pascua";

export function feriadosDelAnio(anio) {
  const pascua = calcularPascua(anio);
  const mapa = {};
  const agregar = (fecha, nombre) => { mapa[ymd(fecha)] = nombre; };

  agregar(new Date(anio, 0, 1), "Año Nuevo (Panamá)");
  agregar(new Date(anio, 0, 9), "Día de los Mártires (Panamá)");
  agregar(new Date(anio, 4, 1), "Día del Trabajador (Panamá)");
  agregar(new Date(anio, 10, 3), "Separación de Panamá de Colombia (Panamá)");
  agregar(new Date(anio, 10, 4), "Día de la Bandera (Panamá)");
  agregar(new Date(anio, 10, 10), "Primer Grito de Independencia (Panamá)");
  agregar(new Date(anio, 10, 28), "Independencia de Panamá de España (Panamá)");
  agregar(new Date(anio, 11, 8), "Día de las Madres (Panamá)");
  agregar(new Date(anio, 11, 25), "Navidad (Panamá)");

  agregar(sumarDias(pascua, -47), "Martes de Carnaval (Panamá)");
  agregar(sumarDias(pascua, -2), "Viernes Santo (Panamá)");

  return mapa;
}

const cache = {};

/** Nombre del feriado bancario de Panamá en esa fecha (YYYY-MM-DD), o null. */
export function nombreFeriado(fechaStr) {
  const anio = Number((fechaStr || "").slice(0, 4));
  if (!anio) return null;
  if (!cache[anio]) cache[anio] = feriadosDelAnio(anio);
  return cache[anio][fechaStr] || null;
}
