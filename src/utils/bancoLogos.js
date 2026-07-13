/* ============================================================
   LOGOS DE BANCOS
   ------------------------------------------------------------
   Cadena de varias fuentes, de la más confiable a la menos, hasta
   dar con una que responda:
     1. Unavatar — un servicio "agregador" pensado justo para esto,
        prueba varias fuentes por su cuenta antes de devolver nada.
     2. DuckDuckGo Icons — muy estable, sin necesidad de llave.
     3. Favicon de Google — respaldo adicional.
     4. Clearbit — se deja al final porque dejó de ser gratuita para
        la mayoría de dominios tras su compra por HubSpot, pero a
        veces todavía responde para algunos.
   Si ninguna responde, la tarjeta cae al avatar de iniciales — eso
   ya está resuelto en el componente que las usa (Tablero.jsx).

   IMPORTANTE: algunos dominios (sobre todo de filiales en Panamá,
   o bancos que no reconozco con certeza) son una mejor suposición,
   no una verificación 100% confirmada. La cadena de varias fuentes
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

function dominioDeBanco(nombreBanco) {
  const n = normalizar(nombreBanco);
  const regla = REGLAS.find((r) => r.test(n));
  return regla ? regla.dominio : null;
}

/**
 * Devuelve la cadena COMPLETA de URLs a intentar para el logo de un
 * banco, de la más confiable a la menos — o un arreglo vacío si no
 * se reconoce el banco. El componente que las use debe ir probando
 * una por una (con onError) hasta que alguna cargue, y si ninguna
 * lo hace, mostrar el avatar de iniciales.
 */
export function logosDeBanco(nombreBanco) {
  const d = dominioDeBanco(nombreBanco);
  if (!d) return [];
  return [
    `https://unavatar.io/${d}?fallback=false`,
    `https://icons.duckduckgo.com/ip3/${d}.ico`,
    `https://www.google.com/s2/favicons?sz=128&domain=${d}`,
    `https://logo.clearbit.com/${d}?size=80`,
  ];
}
