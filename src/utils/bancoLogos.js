/* ============================================================
   LOGOS DE BANCOS
   ------------------------------------------------------------
   Intenta el logo real de Clearbit primero; si esa falla (dejó de
   ser gratuita para muchos dominios), cae al favicon del sitio vía
   Google; si eso también falla, la tarjeta usa el avatar de
   iniciales. Ninguna de las tres etapas requiere llave ni
   configuración.

   IMPORTANTE: algunos dominios (sobre todo de filiales en Panamá,
   o bancos que no reconozco con certeza) son una mejor suposición,
   no una verificación 100% confirmada. El encadenado de respaldos
   existe justo para que un dominio equivocado nunca rompa nada.
   ============================================================ */

function normalizar(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes
}

// Orden importa: los casos más específicos (ej. "banesco panamá") van
// ANTES que los genéricos (ej. "banesco"), para que no los intercepte
// la regla genérica primero.
const REGLAS = [
  { test: (n) => n.includes("banesco") && n.includes("panam"), dominio: "banescopanama.com" },
  { test: (n) => n.includes("mercantil") && n.includes("panam"), dominio: "mercantilbank.com" },
  { test: (n) => n.includes("banesco"), dominio: "banesco.com" },
  { test: (n) => n.includes("mercantil"), dominio: "mercantil.com" },
  { test: (n) => n.includes("provincial") || n.includes("bbva"), dominio: "provincial.com" },
  { test: (n) => n.includes("bancaribe"), dominio: "bancaribe.com.ve" },
  { test: (n) => n.includes("jpmorgan") || n.includes("jp morgan"), dominio: "jpmorgan.com" },
  { test: (n) => n.includes("citibank") || n === "citi" || n.includes("citi "), dominio: "citi.com" },
  { test: (n) => n.includes("bnc") || n.includes("nacional de credito"), dominio: "bncenlinea.com" },
  { test: (n) => n.includes("banco de venezuela") || n.includes("bdv"), dominio: "bancodevenezuela.com" },
  { test: (n) => n.includes("exterior"), dominio: "bancoexterior.com" },
  { test: (n) => n.includes("activo"), dominio: "bancoactivo.com" },
  { test: (n) => n.includes("caroni"), dominio: "bancocaroni.com.ve" },
  { test: (n) => n.includes("bancamiga"), dominio: "bancamiga.com" },
  { test: (n) => n.includes("plaza"), dominio: "bancoplaza.com" },
  { test: (n) => n.includes("sofitasa"), dominio: "sofitasa.com" },
  { test: (n) => n.includes("fondo comun") || n.includes("bfc"), dominio: "bfc.com.ve" },
  { test: (n) => n.includes("venezolano de credito"), dominio: "venezolano.com" },
];

/** Logo principal sugerido (Clearbit) para un banco, o null si no lo reconoce. */
export function logoUrlDeBanco(nombreBanco) {
  const n = normalizar(nombreBanco);
  const regla = REGLAS.find((r) => r.test(n));
  return regla ? `https://logo.clearbit.com/${regla.dominio}?size=80` : null;
}

/**
 * Respaldo si Clearbit no responde (dejó de ser gratuito para muchos
 * dominios tras su compra por HubSpot): el favicon del sitio vía Google,
 * más limitado visualmente pero muy confiable y sin necesidad de llave.
 */
export function logoRespaldoDeBanco(nombreBanco) {
  const n = normalizar(nombreBanco);
  const regla = REGLAS.find((r) => r.test(n));
  return regla ? `https://www.google.com/s2/favicons?sz=128&domain=${regla.dominio}` : null;
}