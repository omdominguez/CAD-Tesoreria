/* ============================================================
   FERIADOS BANCARIOS DE VENEZUELA
   ------------------------------------------------------------
   Incluye los feriados nacionales fijos y los que dependen de la
   fecha de Pascua (Carnaval, Jueves y Viernes Santo), calculados
   matemáticamente — así siempre caen en el día correcto sin
   importar el año.

   IMPORTANTE: el gobierno a veces decreta feriados bancarios
   adicionales o "puentes" de un año a otro. Esta lista cubre el
   calendario estándar conocido; vale la pena confirmar contra el
   calendario oficial de SUDEBAN para el año en curso.
   ============================================================ */
import { calcularPascua, sumarDias, ymd } from "./pascua";

export function feriadosDelAnio(anio) {
  const pascua = calcularPascua(anio);
  const mapa = {};
  const agregar = (fecha, nombre) => { mapa[ymd(fecha)] = nombre; };

  agregar(new Date(anio, 0, 1), "Año Nuevo");
  agregar(new Date(anio, 3, 19), "Declaración de la Independencia");
  agregar(new Date(anio, 4, 1), "Día del Trabajador");
  agregar(new Date(anio, 5, 24), "Batalla de Carabobo");
  agregar(new Date(anio, 6, 5), "Día de la Independencia");
  agregar(new Date(anio, 6, 24), "Natalicio de Simón Bolívar");
  agregar(new Date(anio, 9, 12), "Día de la Resistencia Indígena");
  agregar(new Date(anio, 11, 24), "Nochebuena");
  agregar(new Date(anio, 11, 25), "Navidad");
  agregar(new Date(anio, 11, 31), "Fin de Año");

  agregar(sumarDias(pascua, -48), "Lunes de Carnaval");
  agregar(sumarDias(pascua, -47), "Martes de Carnaval");
  agregar(sumarDias(pascua, -3), "Jueves Santo");
  agregar(sumarDias(pascua, -2), "Viernes Santo");

  return mapa;
}

const cache = {};

/** Nombre del feriado venezolano en esa fecha (YYYY-MM-DD), o null. */
export function nombreFeriado(fechaStr) {
  const anio = Number((fechaStr || "").slice(0, 4));
  if (!anio) return null;
  if (!cache[anio]) cache[anio] = feriadosDelAnio(anio);
  return cache[anio][fechaStr] || null;
}

/** true si es sábado o domingo. */
export function esFinDeSemana(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

/** true si ese día la banca venezolana NO opera (feriado o fin de semana). */
export function esDiaNoBancario(fechaStr) {
  return esFinDeSemana(fechaStr) || Boolean(nombreFeriado(fechaStr));
}
