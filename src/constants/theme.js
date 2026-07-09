/* ============================================================
   PALETA CAD · El Maizalito
   Línea visual inspirada en Ramp: base neutra casi monocromática
   (negro/blanco/grises) con el verde de marca como único acento,
   bordes finos en vez de sombras pesadas, y tipografía sans-serif
   bold para títulos y cifras.

   Estos valores apuntan a variables CSS (ver src/theme.css), que
   cambian automáticamente entre modo claro y oscuro. Así ningún
   componente necesita saber en qué modo está: solo usa C.ink,
   C.line, etc. como siempre.
   ============================================================ */
export const C = {
  // Texto y superficies
  ink: "var(--ink)",             // texto principal
  mut: "var(--mut)",             // texto secundario / etiquetas
  mut2: "var(--mut2)",           // texto terciario / placeholders
  line: "var(--line)",           // bordes finos (hairline)
  lineStrong: "var(--line-strong)", // bordes con más presencia (hover, foco)
  paper: "var(--paper)",         // fondo general de la página
  body: "var(--body)",           // fondo del shell / sidebar
  surface: "var(--surface)",     // tarjetas y superficies elevadas

  // Marca (único acento de color, usado con moderación)
  green: "var(--green)",
  greenDk: "var(--green-dk)",
  greenSoft: "var(--green-soft)",

  // Acento secundario (dorado de marca, uso puntual)
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
  // Un único stack sans-serif (Inter) para toda la app: títulos, cifras y texto.
  // Se conserva el nombre SERIF por compatibilidad con las vistas existentes,
  // pero ahora apunta al mismo stack sans para lograr el look tipo fintech.
  SANS: "'Inter','Inter var',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
  SERIF: "'Inter','Inter var',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
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