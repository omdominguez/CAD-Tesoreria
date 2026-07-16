/* ============================================================
   PERMISOS POR USUARIO
   ------------------------------------------------------------
   El Master decide qué puede ver/hacer cada usuario. Los 3 roles
   funcionan como PLANTILLAS (cargan permisos por defecto), pero
   el Master puede prender/apagar capacidades por persona desde
   Ajustes → Equipo.

   Los permisos por usuario se guardan en el estado compartido
   (st.permisos[userId]) — es un control a nivel de interfaz
   (oculta lo que no corresponde). Para aislamiento total a nivel
   de base de datos haría falta separar las tablas con RLS, que es
   un proyecto de backend aparte.
   ============================================================ */

/** Capacidades editables (Equipo NO está aquí: es siempre solo del Master). */
export const CAPACIDADES = [
  { key: "tablero", label: "Ver Tablero", desc: "Resumen general" },
  { key: "verBancos", label: "Ver disponibilidades bancarias", desc: "Saldos y disponible en el Tablero" },
  { key: "compras", label: "Compras", desc: "Crear pedidos y financiamientos" },
  { key: "ventas", label: "Ventas", desc: "Facturas de venta y cobranzas" },
  { key: "tesoreria", label: "Tesorería", desc: "Pagos, corridas y libro de bancos" },
  { key: "banco", label: "Banco", desc: "Movimientos y conciliación" },
  { key: "reportes", label: "Reportes", desc: "Reporte mensual y análisis de tasas" },
  { key: "ajustes", label: "Ajustes", desc: "Tasas, bancos y contactos" }
];

/** Permisos por defecto de cada rol. */
export const PLANTILLAS = {
  MASTER:    { tablero: true, verBancos: true,  compras: true,  ventas: true,  tesoreria: true,  banco: true,  reportes: true,  ajustes: true },
  TESORERIA: { tablero: true, verBancos: true,  compras: false, ventas: true,  tesoreria: true,  banco: true,  reportes: true,  ajustes: true },
  COMPRAS:   { tablero: true, verBancos: false, compras: true,  ventas: false, tesoreria: false, banco: false, reportes: false, ajustes: false },
  LECTOR:    { tablero: true, verBancos: false, compras: false, ventas: false, tesoreria: false, banco: false, reportes: false, ajustes: false }
};

/**
 * Permisos efectivos de un usuario: parte de la plantilla de su rol y le
 * aplica encima los ajustes que el Master haya guardado para esa persona.
 * El MASTER siempre tiene todo (no se puede autobloquear).
 */
export function permisosEfectivos(rol, guardados) {
  if (rol === "MASTER") return { ...PLANTILLAS.MASTER };
  const base = PLANTILLAS[rol] || PLANTILLAS.COMPRAS;
  return { ...base, ...(guardados || {}) };
}
