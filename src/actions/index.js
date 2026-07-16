/* ============================================================
   ENSAMBLADOR DE ACCIONES
   ------------------------------------------------------------
   Cada dominio del negocio (tasas, bancos, contactos, compras,
   pagos, corridas, ventas) tiene su propio archivo de acciones —
   así, para entender o modificar algo puntual, se abre solo el
   archivo de ESE tema en vez de buscarlo dentro de un solo
   App.jsx enorme con todo mezclado.

   Si agregas un dominio nuevo en el futuro: crea su propio
   archivo `actionsLoQueSea.js` siguiendo el mismo patrón (una
   función que recibe `setSt` y `userId`, y devuelve un objeto con
   sus acciones), y agrégalo aquí abajo.
   ============================================================ */

import { crearAccionesTasas } from "./actionsTasas";
import { crearAccionesBancos } from "./actionsBancos";
import { crearAccionesProveedores } from "./actionsProveedores";
import { crearAccionesCompras } from "./actionsCompras";
import { crearAccionesPagos } from "./actionsPagos";
import { crearAccionesCorridas } from "./actionsCorridas";
import { crearAccionesVentas } from "./actionsVentas";
import { crearAccionesConciliacion } from "./actionsConciliacion";
import { crearAccionesPermisos } from "./actionsPermisos";

/**
 * Arma el objeto `act` completo que usa toda la app.
 * @param {Function} setSt - el setState del estado global
 * @param {string} userId - id del usuario actual (para guardar en Supabase)
 */
export function crearAcciones(setSt, userId) {
  return {
    ...crearAccionesTasas(setSt, userId),
    ...crearAccionesBancos(setSt, userId),
    ...crearAccionesProveedores(setSt, userId),
    ...crearAccionesCompras(setSt, userId),
    ...crearAccionesPagos(setSt, userId),
    ...crearAccionesCorridas(setSt, userId),
    ...crearAccionesVentas(setSt, userId),
    ...crearAccionesConciliacion(setSt, userId),
    ...crearAccionesPermisos(setSt, userId),
  };
}
