/* ============================================================
   PLANIFICACIÓN FINANCIERA
   ------------------------------------------------------------
   Dos herramientas de tesorería que se apoyan en lo que ya existe
   (activo(), usdComp, brutoUSD...) pero mirando hacia ADELANTE:

   1) flujoRodante: arranca del disponible real en bancos HOY y
      va acumulando semana a semana los cobros y pagos que vencen,
      para saber en qué semana el saldo proyectado se pondría en
      rojo — no solo cuánto entra/sale cada semana por separado.

   2) sugerenciaPrioridadPago: si hoy no alcanza el efectivo para
      pagar todo lo vencido/por vencer, ordena los pagos pendientes
      por urgencia real (vencido > prioridad > fecha) y marca hasta
      dónde alcanza el disponible actual.
   ============================================================ */

import {
  hoy0, parseD, diasEntre, startWeek,
  activo, activoCxC, usdComp, usdCxCPendiente,
  brutoUSD, provNom
} from "./finance";

const PESO_PRIORIDAD = { URGENTE: 0, NORMAL: 1, FLEXIBLE: 2 };

/**
 * Flujo de caja rodante: disponible actual + cobros/pagos proyectados,
 * semana a semana, con el SALDO ACUMULADO (no solo el neto de la semana).
 * Lo vencido/atrasado se aplica de una vez en la semana 0 ("Hoy"), como
 * ya debería estar resuelto.
 *
 * @returns {
 *   disponibleHoy, semanas: [{ nombre, ingreso, egreso, neto, saldoProyectado, negativo }],
 *   primeraSemanaNegativa: número de semana (1-based) o null,
 *   montoMinimoNegativo: cuánto por debajo de cero llega a estar, o null
 * }
 */
export function flujoRodante(st, numSemanas = 13) {
  const hoy = hoy0();
  const w0 = startWeek(hoy);
  const disponibleHoy = (st.bancos || []).reduce((a, b) => a + brutoUSD(st, b), 0);

  const semanas = Array.from({ length: numSemanas }, (_, i) => ({
    nombre: "Sem " + (i + 1),
    ingreso: 0,
    egreso: 0
  }));
  let vencidoEgreso = 0;
  let vencidoIngreso = 0;

  (st.compromisos || []).filter((c) => activo(st, c)).forEach((c) => {
    const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
    const v = usdComp(st, c);
    if (idx < 0) vencidoEgreso += v;
    else if (idx < numSemanas) semanas[idx].egreso += v;
  });

  (st.cuentasCobrar || []).filter((c) => activoCxC(st, c)).forEach((c) => {
    const idx = Math.floor(diasEntre(w0, parseD(c.fechaVencimiento)) / 7);
    const v = usdCxCPendiente(st, c);
    if (idx < 0) vencidoIngreso += v;
    else if (idx < numSemanas) semanas[idx].ingreso += v;
  });

  let saldo = disponibleHoy + vencidoIngreso - vencidoEgreso;
  let primeraSemanaNegativa = null;
  let montoMinimoNegativo = null;

  const semanasConSaldo = semanas.map((s, i) => {
    const neto = s.ingreso - s.egreso;
    saldo += neto;
    const negativo = saldo < 0;
    if (negativo && primeraSemanaNegativa === null) primeraSemanaNegativa = i + 1;
    if (negativo && (montoMinimoNegativo === null || saldo < montoMinimoNegativo)) montoMinimoNegativo = saldo;
    return { ...s, neto, saldoProyectado: saldo, negativo };
  });

  return { disponibleHoy, vencidoEgreso, vencidoIngreso, semanas: semanasConSaldo, primeraSemanaNegativa, montoMinimoNegativo };
}

/**
 * Sugerencia de con qué pagar primero cuando el disponible no alcanza para
 * todo lo pendiente. Orden: 1) vencido antes que lo que aún no vence,
 * 2) prioridad (Urgente > Normal > Flexible), 3) fecha de vencimiento más
 * próxima primero. Va acumulando el monto y marca la línea donde el
 * disponible actual se agota — lo de abajo de esa línea tendría que
 * esperar a que entre más efectivo (o se libere de otro banco).
 */
export function sugerenciaPrioridadPago(st) {
  const hoy = hoy0();
  const disponibleUSD = (st.bancos || []).reduce((a, b) => a + brutoUSD(st, b), 0);

  const pendientes = (st.compromisos || [])
    .filter((c) => activo(st, c))
    .map((c) => {
      const dv = diasEntre(hoy, parseD(c.fechaVencimiento));
      return {
        id: c.id,
        proveedor: provNom(st, c.proveedorId),
        descripcion: c.descripcion || c.numeroPedidoOdoo || "Compromiso de pago",
        montoUSD: usdComp(st, c),
        fechaVencimiento: c.fechaVencimiento,
        vencido: dv < 0,
        diasDiff: dv,
        prioridad: c.prioridad || "NORMAL",
        bancoAsignadoId: c.bancoAsignadoId || null,
        registro: c
      };
    })
    .sort((a, b) => {
      if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
      const pa = PESO_PRIORIDAD[a.prioridad] ?? 1;
      const pb = PESO_PRIORIDAD[b.prioridad] ?? 1;
      if (pa !== pb) return pa - pb;
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    });

  let acumulado = 0;
  let cortadoEn = null;
  const conAcumulado = pendientes.map((p, i) => {
    acumulado += p.montoUSD;
    const alcanza = acumulado <= disponibleUSD;
    if (!alcanza && cortadoEn === null) cortadoEn = i;
    return { ...p, acumulado, alcanza };
  });

  return { disponibleUSD, pendientes: conAcumulado, cortadoEn, totalPendiente: acumulado };
}
