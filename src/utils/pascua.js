/** Fecha de Pascua (domingo de resurrección) para un año dado — algoritmo de Meeus. */
export function calcularPascua(anio) {
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

export function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

export function ymd(d) {
  return d.toISOString().slice(0, 10);
}

/** El n-ésimo día de la semana (0=domingo..6=sábado) de un mes. n negativo cuenta desde el final. */
export function nEsimoDiaSemana(anio, mesIndex, diaSemana, n) {
  if (n > 0) {
    const primero = new Date(anio, mesIndex, 1);
    const offset = (diaSemana - primero.getDay() + 7) % 7;
    return new Date(anio, mesIndex, 1 + offset + (n - 1) * 7);
  }
  // n negativo: contar desde el último día del mes hacia atrás
  const ultimo = new Date(anio, mesIndex + 1, 0);
  const offset = (ultimo.getDay() - diaSemana + 7) % 7;
  return new Date(anio, mesIndex, ultimo.getDate() - offset + (n + 1) * 7);
}
