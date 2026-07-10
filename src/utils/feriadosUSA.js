/* ============================================================
   FERIADOS BANCARIOS DE ESTADOS UNIDOS
   ------------------------------------------------------------
   Calendario oficial de días no laborables de la Reserva Federal
   (los que rigen para transferencias bancarias en USD). La mayoría
   se calculan como "el n-ésimo lunes/jueves de tal mes", así que
   funcionan igual de bien para cualquier año.

   IMPORTANTE: cuando un feriado fijo cae sábado o domingo, la
   Reserva Federal lo observa el viernes anterior o el lunes
   siguiente — esa regla también está incluida aquí.
   ============================================================ */
import { nEsimoDiaSemana, ymd } from "./pascua";

/** Si `fecha` cae sábado, la observan el viernes anterior; si cae domingo, el lunes siguiente. */
function observado(fecha) {
  const dia = fecha.getDay();
  if (dia === 6) { const f = new Date(fecha); f.setDate(f.getDate() - 1); return f; }
  if (dia === 0) { const f = new Date(fecha); f.setDate(f.getDate() + 1); return f; }
  return fecha;
}

export function feriadosDelAnio(anio) {
  const mapa = {};
  const agregar = (fecha, nombre) => { mapa[ymd(observado(fecha))] = nombre; };

  agregar(new Date(anio, 0, 1), "Año Nuevo (EE.UU.)");
  agregar(nEsimoDiaSemana(anio, 0, 1, 3), "Día de Martin Luther King Jr. (EE.UU.)"); // 3er lunes de enero
  agregar(nEsimoDiaSemana(anio, 1, 1, 3), "Día de los Presidentes (EE.UU.)"); // 3er lunes de febrero
  agregar(nEsimoDiaSemana(anio, 4, 1, -1), "Día de los Caídos (EE.UU.)"); // último lunes de mayo
  agregar(new Date(anio, 5, 19), "Juneteenth (EE.UU.)");
  agregar(new Date(anio, 6, 4), "Día de la Independencia (EE.UU.)");
  agregar(nEsimoDiaSemana(anio, 8, 1, 1), "Día del Trabajo (EE.UU.)"); // 1er lunes de septiembre
  agregar(nEsimoDiaSemana(anio, 9, 1, 2), "Día de Colón (EE.UU.)"); // 2do lunes de octubre
  agregar(new Date(anio, 10, 11), "Día de los Veteranos (EE.UU.)");
  agregar(nEsimoDiaSemana(anio, 10, 4, 4), "Día de Acción de Gracias (EE.UU.)"); // 4to jueves de noviembre
  agregar(new Date(anio, 11, 25), "Navidad (EE.UU.)");

  return mapa;
}

const cache = {};

/** Nombre del feriado bancario de EE.UU. en esa fecha (YYYY-MM-DD), o null. */
export function nombreFeriado(fechaStr) {
  const anio = Number((fechaStr || "").slice(0, 4));
  if (!anio) return null;
  if (!cache[anio]) cache[anio] = feriadosDelAnio(anio);
  return cache[anio][fechaStr] || null;
}
