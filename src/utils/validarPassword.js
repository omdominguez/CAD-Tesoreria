/* ============================================================
   VALIDACIÓN DE CONTRASEÑA SEGURA
   ------------------------------------------------------------
   Reglas mínimas razonables para una app de uso interno (no exige
   caracteres especiales para no volverse frustrante, pero sí un
   largo mínimo y variedad de mayúsculas/minúsculas/números).
   ============================================================ */

export const REGLAS_PASSWORD = [
  { id: "largo", label: "Al menos 8 caracteres", test: (p) => p.length >= 8 },
  { id: "mayus", label: "Al menos una letra mayúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "minus", label: "Al menos una letra minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "num", label: "Al menos un número", test: (p) => /[0-9]/.test(p) },
];

/** Devuelve las reglas con su estado cumplido/no cumplido para una contraseña dada. */
export function evaluarPassword(password = "") {
  return REGLAS_PASSWORD.map((r) => ({ ...r, ok: r.test(password) }));
}

/** true si la contraseña cumple TODAS las reglas mínimas. */
export function passwordEsValida(password = "") {
  return REGLAS_PASSWORD.every((r) => r.test(password));
}
