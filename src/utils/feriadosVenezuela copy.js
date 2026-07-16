/* ============================================================
   FERIADOS BANCARIOS DE VENEZUELA
   ------------------------------------------------------------
   Incluye los feriados nacionales fijos y los que dependen de la
   fecha de Pascua (Carnaval, Jueves y Viernes Santo), calculados
   matemáticamente — así siempre caen en el día correcto sin
   importar el año, sin necesidad de mantener una lista a mano.

   IMPORTANTE: el gobierno a veces decreta feriados bancarios
   adicionales o "puentes" de un año a otro (por ejemplo, algún 24 o
   31 de diciembre declarado no laborable para la banca). Esta lista
   cubre el calendario estándar conocido; para el año en curso vale
   la pena confirmar contra el calendario oficial de SUDEBAN.
   ============================================================ */

/** Fecha de Pascua (domingo de resurrección) para un año dado — algoritmo de Meeus. */
function calcularPascua(anio) {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/** Devuelve { "YYYY-MM-DD": "Nombre del feriado" } para un año dado. */
export function feriadosDelAnio(anio) {
  const pascua = calcularPascua(anio);
  const mapa = {};

  const agregar = (fecha, nombre) => { mapa[ymd(fecha)] = nombre; };

  // Fijos
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

  // Móviles (relativos a la Pascua)
  agregar(sumarDias(pascua, -48), "Lunes de Carnaval");
  agregar(sumarDias(pascua, -47), "Martes de Carnaval");
  agregar(sumarDias(pascua, -3), "Jueves Santo");
  agregar(sumarDias(pascua, -2), "Viernes Santo");

  return mapa;
}

const cache = {};

/** Nombre del feriado en esa fecha (YYYY-MM-DD), o null si es día hábil. */
export function nombreFeriado(fechaStr) {
  const anio = Number((fechaStr || "").slice(0, 4));
  if (!anio) return null;
  if (!cache[anio]) cache[anio] = feriadosDelAnio(anio);
  return cache[anio][fechaStr] || null;
}

/** true si es sábado o domingo (la banca tampoco opera estos días). */
export function esFinDeSemana(fechaStr) {
  const d = new Date(fechaStr + "T00:00:00");
  const dia = d.getDay();
  return dia === 0 || dia === 6;
}

/** true si ese día la banca NO opera (feriado o fin de semana). */
export function esDiaNoBancario(fechaStr) {
  return esFinDeSemana(fechaStr) || Boolean(nombreFeriado(fechaStr));
}