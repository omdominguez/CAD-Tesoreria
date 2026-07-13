/* ============================================================
   PALETA CAD VENEZUELA · según Manual de Marca v1.0 (abril 2026)
   ------------------------------------------------------------
   CAD Navy ancla la identidad institucional; Verde agro respalda
   lo positivo/aprobado; Naranja energía es el acento de llamada a
   la acción (botones principales). Bordes finos, tipografía
   Poppins (la operativa oficial de marca) para todo el sistema.

   Estos valores apuntan a variables CSS (ver src/theme.css), que
   cambian automáticamente entre modo claro y oscuro. Así ningún
   componente necesita saber en qué modo está: solo usa C.ink,
   C.line, etc. como siempre.
   ============================================================ */
export const C = {
  // Texto y superficies
  ink: "var(--ink)",             // texto principal (Tinta)
  mut: "var(--mut)",             // texto secundario / etiquetas (Apagado)
  mut2: "var(--mut2)",           // texto terciario / placeholders
  line: "var(--line)",           // bordes finos (Línea)
  lineStrong: "var(--line-strong)", // bordes con más presencia (hover, foco)
  paper: "var(--paper)",         // fondo general de la página (Superficie)
  body: "var(--body)",           // fondo del shell / sidebar
  surface: "var(--surface)",     // tarjetas y superficies elevadas (Papel)

  // CAD Navy: el ancla institucional de la marca (logo, títulos de marca)
  navy: "var(--navy)",
  navySoft: "var(--navy-soft)",

  // Verde agro: secundario — positivo, aprobado, activo
  green: "var(--green)",
  greenDk: "var(--green-dk)",
  greenSoft: "var(--green-soft)",

  // Naranja energía: acento/CTA — botones y llamadas a la acción principales
  gold: "var(--gold)",
  goldSoft: "var(--gold-soft)",

  // Estados / semántica
  rojo: "var(--rojo)",
  rojoSoft: "var(--rojo-soft)",
  amar: "var(--amar)",
  amarSoft: "var(--amar-soft)",
  verde: "var(--verde)",
  verdeSoft: "var(--verde-soft)",
  azul: "var(--azul)",
  azulSoft: "var(--azul-soft)",
};

export const FONTS = {
  // Poppins es la tipografía operativa oficial del Manual de Marca CAD —
  // se usa para todo: títulos, cifras y texto de cuerpo.
  SANS: "'Poppins',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  SERIF: "'Poppins',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  // Bebas Neue: SOLO para momentos puntuales de gran escala (portadas,
  // pantallas de login) — el manual prohíbe usarla en cuerpo de texto,
  // tablas o leyendas.
  DISPLAY: "'Bebas Neue',system-ui,sans-serif",
};

export const UI = {
  RADIUS: 12,
  RADIUS_SM: 8,
  SHADOW: "var(--shadow)",
  SHADOW_SM: "none",
  SHADOW_MODAL: "var(--shadow-modal)",
};

/* ============================================================
   CONSTANTES DE NEGOCIO
   ============================================================ */
export const ROLES = { 
  COMPRAS: "Compras", 
  TESORERIA: "Tesorería", 
  MASTER: "Master / Gerente", 
  LECTOR: "Lector (solo lectura)" 
};

export const CATS = [
  "Materia Prima", 
  "Activo Fijo (CAPEX)", 
  "Servicios", 
  "Insumos", 
  "Otros"
];

export const CLASIF = [
  "Materia Prima", 
  "Activo Fijo (CAPEX)", 
  "Servicios", 
  "Insumos", 
  "Financiamiento", 
  "Otros"
];

export const TIPOS_MOV = [
  ["ANTICIPO", "Anticipo"], 
  ["ABONO", "Abono"], 
  ["TRANSFERENCIA", "Transferencia / Pago"], 
  ["CRUCE", "Cruce de cuenta (venta)"]
];