/* ============================================================
   UTILIDADES DE FORMATO Y FECHAS
   ============================================================ */
export const nf = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nf0 = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

export const money = (n, m = "USD") => {
  const prefix = m === "BS" ? "Bs " : m === "EUR" ? "€ " : "$ ";
  return prefix + nf.format(Number(n || 0));
};

export const hoy0 = () => { 
  const d = new Date(); 
  d.setHours(0, 0, 0, 0); 
  return d; 
};

export const parseD = (s) => (s ? new Date(s + "T00:00:00") : null);

export const fmtD = (s) => { 
  const d = parseD(s); 
  return d ? d.toLocaleDateString("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"; 
};

export const diasEntre = (a, b) => Math.round((b - a) / 86400000);

export function startWeek(d) { 
  const x = new Date(d); 
  const off = (x.getDay() + 6) % 7; 
  x.setDate(x.getDate() - off); 
  x.setHours(0, 0, 0, 0); 
  return x; 
}

/* ============================================================
   HISTÓRICO Y VARIACIÓN DE TASAS DE CAMBIO
   ------------------------------------------------------------
   Cada vez que se edita una tasa se guarda un "cierre del día"
   en st.historialTasas (una foto de las 3 tasas por fecha).
   Con eso se puede comparar el valor actual contra el cierre
   del día hábil anterior, como en un ticker bursátil.
   ============================================================ */
export const hoyStr = () => new Date().toISOString().slice(0, 10);

const TASAS_KEYS = ["tasaBCV", "tasaIntervencion", "tasaParalelo"];

/** Devuelve un nuevo estado con la foto de hoy actualizada en historialTasas. */
export function conSnapshotDeHoy(state) {
  const hoy = hoyStr();
  const snap = {};
  TASAS_KEYS.forEach((k) => { snap[k] = Number(state.config?.[k]) || 0; });
  return {
    ...state,
    historialTasas: { ...(state.historialTasas || {}), [hoy]: snap },
  };
}

/** Busca la fecha más reciente registrada en el historial anterior a hoy. */
function fechaAnteriorMasReciente(historial) {
  const hoy = hoyStr();
  const fechas = Object.keys(historial || {}).filter((f) => f < hoy).sort();
  return fechas.length ? fechas[fechas.length - 1] : null;
}

/**
 * Devuelve, para cada una de las 3 tasas, su valor actual, el valor de
 * cierre del día anterior registrado, la variación absoluta y el
 * porcentaje de cambio (como en un ticker de bolsa).
 */
export function variacionTasas(state) {
  const cfg = state.config || {};
  const historial = state.historialTasas || {};
  const fechaBase = fechaAnteriorMasReciente(historial);
  const base = fechaBase ? historial[fechaBase] : null;

  const LABELS = { tasaBCV: "BCV", tasaIntervencion: "Intervención", tasaParalelo: "Paralelo" };

  return TASAS_KEYS.map((k) => {
    const valor = Number(cfg[k]) || 0;
    const anterior = base ? Number(base[k]) || 0 : null;
    const cambio = anterior !== null ? valor - anterior : null;
    const pct = anterior && anterior > 0 ? (cambio / anterior) * 100 : null;
    return { key: k, label: LABELS[k], valor, anterior, cambio, pct };
  });
}

/**
 * Compara las 3 tasas entre sí (no contra el día anterior, sino unas
 * con otras): cuánto más cara es la paralela que la BCV, etc. Útil
 * para dimensionar de un vistazo la brecha cambiaria del día.
 */
export function comparativaEntreTasas(state) {
  const cfg = state.config || {};
  const bcv = Number(cfg.tasaBCV) || 0;
  const interv = Number(cfg.tasaIntervencion) || 0;
  const paralelo = Number(cfg.tasaParalelo) || 0;

  const brecha = (base, comparado) => (base > 0 ? ((comparado - base) / base) * 100 : null);

  return [
    { key: "interv-bcv", label: "Intervención vs BCV", pct: brecha(bcv, interv) },
    { key: "paralelo-bcv", label: "Paralelo vs BCV", pct: brecha(bcv, paralelo) },
    { key: "paralelo-interv", label: "Paralelo vs Intervención", pct: brecha(interv, paralelo) },
  ];
}

/**
 * Agrupa una serie de tasas diarias { fecha, valor } por mes calendario
 * y calcula la variación porcentual entre el primer y el último valor
 * registrado de cada mes (la devaluación/"inflación en bolívares" de
 * ese mes). Ignora meses con un solo dato (no hay variación que medir).
 */
export function variacionMensual(historial) {
  const porMes = {};
  (historial || []).forEach((r) => {
    const mes = (r.fecha || "").slice(0, 7); // YYYY-MM
    if (!mes) return;
    if (!porMes[mes]) porMes[mes] = [];
    porMes[mes].push(r);
  });

  return Object.keys(porMes)
    .sort()
    .map((mes) => {
      const puntos = porMes[mes].sort((a, b) => a.fecha.localeCompare(b.fecha));
      const apertura = puntos[0].valor;
      const cierre = puntos[puntos.length - 1].valor;
      const pct = apertura > 0 ? ((cierre - apertura) / apertura) * 100 : null;
      return { mes, apertura, cierre, pct, puntos: puntos.length };
    })
    .filter((m) => m.puntos > 1);
}

/* ============================================================
   BÚSQUEDAS BÁSICAS
   ============================================================ */
export const eqUSD = (bs, tasa) => (Number(tasa) && Number(tasa) > 0 ? Number(bs) / Number(tasa) : 0);

export const prov = (st, id) => (st.proveedores || []).find((p) => p.id === id);
export const banco = (st, id) => (st.bancos || []).find((b) => b.id === id);
export const provNom = (st, id) => prov(st, id)?.razonSocial || "—";
export const bancoNom = (st, id) => banco(st, id)?.nombre || "Sin asignar";

export const bancosProv = (p) => Array.isArray(p?.bancos) ? p.bancos : (p?.bancoDestino ? [{ banco: p.bancoDestino, cuenta: p.cuentaDestino || "" }] : []);
export const esProv = (c) => c.esProveedor !== false;
export const esCli = (c) => c.esCliente === true;


/* ============================================================
   Cuentas por Pagar (CxP - Compras)
   ============================================================ */
export const movsDe = (st, cid) => (st.movimientos || []).filter((m) => m.compromisoId === cid);
export const pagadoDe = (st, cid) => movsDe(st, cid).reduce((a, m) => a + Number(m.monto), 0);
export const pendienteDe = (st, c) => Math.max(0, Number(c.montoOriginal) - pagadoDe(st, c.id));

export function estadoDe(st, c) {
  if (c.anulado) return "ANULADO";
  const pend = pendienteDe(st, c);
  if (pend <= 0.005) return "PAGADO";
  if (pagadoDe(st, c.id) > 0) return "PARCIAL";
  return "PENDIENTE";
}

export const activo = (st, c) => !c.anulado && ["PENDIENTE", "PARCIAL"].includes(estadoDe(st, c));

// Tasa histórica del registro para evitar fluctuaciones en la deuda pasada
export const tasaDe = (st, c) => Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1;
export const usdComp = (st, c) => c.moneda === "USD" ? pendienteDe(st, c) : pendienteDe(st, c) / tasaDe(st, c);
export const usdPagado = (st, c) => c.moneda === "USD" ? pagadoDe(st, c.id) : pagadoDe(st, c.id) / tasaDe(st, c);

export const pedidosProv = (st, pid) => (st.compromisos || []).filter((c) => c.proveedorId === pid && !c.anulado);
export const pendienteProv = (st, pid) => pedidosProv(st, pid).reduce((a, c) => a + usdComp(st, c), 0);
export const pagadoProv = (st, pid) => pedidosProv(st, pid).reduce((a, c) => a + usdPagado(st, c), 0);


/* ============================================================
   Cuentas por Cobrar (CxC - Ventas)
   ============================================================ */
export const cxcDeCli = (st, cid) => (st.cuentasCobrar || []).filter((c) => c.clienteId === cid && !c.anulado);
export const cobrosDeCxC = (st, cxcId) => (st.cobranzas || []).filter((c) => c.cuentaCobrarId === cxcId);
export const cobradoDeCxC = (st, cxcId) => cobrosDeCxC(st, cxcId).reduce((a, c) => a + Number(c.monto), 0);
export const pendienteCxC = (st, cxc) => Math.max(0, Number(cxc.montoOriginal) - cobradoDeCxC(st, cxc.id));

export function estadoCxC(st, c) {
  if (c.anulado) return "ANULADO";
  const pend = pendienteCxC(st, c);
  if (pend <= 0.005) return "COBRADO";
  if (cobradoDeCxC(st, c.id) > 0) return "PARCIAL";
  return "PENDIENTE";
}

export const activoCxC = (st, c) => !c.anulado && ["PENDIENTE", "PARCIAL"].includes(estadoCxC(st, c));

export const tasaCxC = (st, c) => Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1;
export const usdCxCPendiente = (st, c) => c.moneda === "USD" ? pendienteCxC(st, c) : pendienteCxC(st, c) / tasaCxC(st, c);
export const usdCxCCobrado = (st, c) => c.moneda === "USD" ? cobradoDeCxC(st, c.id) : cobradoDeCxC(st, c.id) / tasaCxC(st, c);

export const pendienteCli = (st, cid) => cxcDeCli(st, cid).reduce((a, c) => a + usdCxCPendiente(st, c), 0);
export const cobradoCli = (st, cid) => cxcDeCli(st, cid).reduce((a, c) => a + usdCxCCobrado(st, c), 0);


/* ============================================================
   BANCOS Y TESORERÍA
   ============================================================ */
export function brutoUSD(st, b) { 
  const t = Number(st.config.tasaBCV) || 1; 
  return b.moneda === "USD" ? Number(b.saldoActual) : Number(b.saldoActual) / t; 
}

export function comprometidoBanco(st, b) {
  return (st.compromisos || []).filter((c) => c.bancoAsignadoId === b.id && activo(st, c))
    .reduce((a, c) => {
      const p = pendienteDe(st, c);
      if (c.moneda === b.moneda) return a + p;
      if (b.moneda === "USD") return a + usdComp(st, c);
      return a + (p * (Number(st.config.tasaBCV) || 1));
    }, 0);
}


/* ============================================================
   ESTADOS DE CUENTA (Ledgers Históricos)
   ============================================================ */
export function ledgerProv(st, p) {
  const rows = [];
  
  pedidosProv(st, p.id).forEach((c) => {
    const t = tasaDe(st, c);
    
    // Cargo (Lo que le debemos / Factura del proveedor)
    rows.push({ 
      fecha: c.fechaPedido || c.fechaVencimiento, 
      tipo: "Compra", 
      pedido: c.numeroPedidoOdoo || "—",
      doc: c.numeroPedidoOdoo || "—", 
      detalle: c.descripcion || "Pedido de compra", 
      moneda: c.moneda, 
      cargo: Number(c.montoOriginal), 
      abono: 0, 
      usd: c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / t 
    });
    
    // Abono (Lo que le pagamos)
    movsDe(st, c.id).forEach((m) => {
      const mu = m.moneda === "USD" ? Number(m.monto) : Number(m.monto) / t;
      rows.push({ 
        fecha: m.fecha, 
        tipo: m.tipo === "CRUCE" ? "Cruce" : "Pago", 
        pedido: c.numeroPedidoOdoo || "—",
        doc: m.referencia || "—", 
        detalle: c.numeroPedidoOdoo ? "Pedido " + c.numeroPedidoOdoo : (c.descripcion || "Pago"), 
        moneda: m.moneda, 
        cargo: 0, 
        abono: Number(m.monto), 
        usd: -mu 
      });
    });
  });
  
  rows.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  
  let s = 0; 
  rows.forEach((r) => { 
    s += r.usd; 
    r.saldo = s; 
  });
  
  return rows;
}

export function ledgerCli(st, p) {
  const rows = [];
  
  // Cargo (Lo que el cliente nos debe / Factura emitida)
  cxcDeCli(st, p.id).forEach((c) => {
    const t = tasaCxC(st, c);
    rows.push({ 
      fecha: c.fechaEmision || c.fechaVencimiento, 
      tipo: "Factura", 
      pedido: c.numeroFactura || "—",
      doc: c.numeroFactura || "—", 
      detalle: c.descripcion || "Factura de venta", 
      moneda: c.moneda, 
      cargo: Number(c.montoOriginal), 
      abono: 0, 
      usd: c.moneda === "USD" ? Number(c.montoOriginal) : Number(c.montoOriginal) / t 
    });
  });
  
  // Abono (Lo que el cliente nos paga)
  (st.cobranzas || []).filter((c) => c.clienteId === p.id).forEach((m) => {
    // Busca si este cobro está atado a una factura específica para usar su tasa histórica
    const facRelacionada = m.cuentaCobrarId ? (st.cuentasCobrar || []).find(f => f.id === m.cuentaCobrarId) : null;
    const t = facRelacionada ? tasaCxC(st, facRelacionada) : (Number(st.config.tasaBCV) || 1);
    
    const mu = m.moneda === "USD" ? Number(m.monto) : Number(m.monto) / t;
    
    rows.push({ 
      fecha: m.fecha, 
      tipo: "Cobro", 
      pedido: facRelacionada ? (facRelacionada.numeroFactura || "—") : "—",
      doc: m.descripcion || "—", 
      detalle: "Cobranza recibida", 
      moneda: m.moneda, 
      cargo: 0, 
      abono: Number(m.monto), 
      usd: -mu 
    });
  });
  
  rows.sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  
  let s = 0; 
  rows.forEach((r) => { 
    s += r.usd; 
    r.saldo = s; 
  });
  
  return rows;
}

/* ============================================================
   TIPOS DE MOVIMIENTOS
   ============================================================ */
export const TIPOS_MOV = {
  TRANSFERENCIA: { lbl: "Transferencia", tone: "good" },
  EFECTIVO: { lbl: "Efectivo", tone: "warn" },
  ZELLE: { lbl: "Zelle", tone: "info" },
  PAGO_MOVIL: { lbl: "Pago Móvil", tone: "good" },
  CRUCE: { lbl: "Cruce de Cuentas", tone: "mut" }
};