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

const TASAS_KEYS = ["tasaBCV", "tasaIntervencion", "tasaParalelo", "tasaBcvEuro"];

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

  const LABELS = { tasaBCV: "BCV", tasaIntervencion: "Intervención", tasaParalelo: "Paralelo", tasaBcvEuro: "BCV Euro" };

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
/**
 * Compara cada tasa contra BCV Dólar (la referencia base), en vez de
 * comparaciones cruzadas entre sí: "BCV Dólar vs Paralelo", "BCV Dólar
 * vs Intervención", "BCV Dólar vs BCV Euro". Útil para dimensionar de
 * un vistazo qué tan lejos está cada tasa de la oficial en dólares.
 */
export function comparativaEntreTasas(state) {
  const cfg = state.config || {};
  const bcv = Number(cfg.tasaBCV) || 0;
  const interv = Number(cfg.tasaIntervencion) || 0;
  const paralelo = Number(cfg.tasaParalelo) || 0;
  const euro = Number(cfg.tasaBcvEuro) || 0;

  const brecha = (base, comparado) => (base > 0 ? ((comparado - base) / base) * 100 : null);

  return [
    { key: "bcv-paralelo", label: "BCV Dólar vs Paralelo", pct: brecha(bcv, paralelo) },
    { key: "bcv-interv", label: "BCV Dólar vs Intervención", pct: brecha(bcv, interv) },
    { key: "bcv-euro", label: "BCV Dólar vs BCV Euro", pct: brecha(bcv, euro) },
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

/** Busca una cuenta bancaria específica de un proveedor por su id. */
export const cuentaProvPorId = (p, cuentaId) => bancosProv(p).find((b) => b.id === cuentaId) || null;

/** Texto corto para mostrar una cuenta bancaria de proveedor (banco + últimos dígitos, SWIFT si es internacional, o wallet si es cripto). */
export function resumenCuenta(cta) {
  if (!cta) return null;
  if (cta.tipo === "CRIPTO") {
    const wallet = cta.walletAddress || "";
    const corta = wallet.length > 10 ? wallet.slice(0, 6) + "…" + wallet.slice(-4) : wallet;
    return [cta.moneda || "Cripto", cta.red, corta].filter(Boolean).join(" — ");
  }
  const partes = [cta.banco || "Banco sin nombre"];
  if (cta.tipo === "INTERNACIONAL") {
    if (cta.swift) partes.push(`SWIFT ${cta.swift}`);
  } else if (cta.cuenta) {
    partes.push(cta.cuenta.length > 4 ? "•••" + cta.cuenta.slice(-4) : cta.cuenta);
  }
  return partes.join(" — ");
}
export const esProv = (c) => c.esProveedor !== false;
export const esCli = (c) => c.esCliente === true;


/* ============================================================
   Cuentas por Pagar (CxP - Compras)
   ============================================================ */
export const movsDe = (st, cid) => (st.movimientos || []).filter((m) => m.compromisoId === cid);
/**
 * Cuánto se ha pagado de un compromiso, expresado en SU MISMA moneda
 * (c.moneda) — aunque el pago se haya hecho en otra moneda distinta
 * (ej. pedido en USD pagado en Bs), se convierte usando la tasa que
 * quedó registrada en ese movimiento puntual (o la tasa actual como
 * respaldo, para movimientos antiguos que no la tenían guardada).
 */
export const pagadoDe = (st, c) => {
  const monedaObjetivo = c.moneda;
  return movsDe(st, c.id).reduce((a, m) => {
    if (!m.moneda || m.moneda === monedaObjetivo) return a + Number(m.monto);
    const tasa = Number(m.tasaBcvPago) || Number(st.config.tasaBCV) || 1;
    if (monedaObjetivo === "USD" && m.moneda === "BS") return a + Number(m.monto) / tasa;
    if (monedaObjetivo === "BS" && m.moneda === "USD") return a + Number(m.monto) * tasa;
    return a + Number(m.monto);
  }, 0);
};
export const pendienteDe = (st, c) => Math.max(0, Number(c.montoOriginal) - pagadoDe(st, c));

export function estadoDe(st, c) {
  if (c.anulado) return "ANULADO";
  const pend = pendienteDe(st, c);
  if (pend <= 0.005) return "PAGADO";
  if (pagadoDe(st, c) > 0) return "PARCIAL";
  return "PENDIENTE";
}

export const activo = (st, c) => !c.anulado && ["PENDIENTE", "PARCIAL"].includes(estadoDe(st, c));

// Tasa histórica del registro para evitar fluctuaciones en la deuda pasada
/**
 * Traduce la "forma de pago" elegida en el pedido (informativa) a la
 * tasa de Bs que corresponde aplicar EN ESE MOMENTO (siempre la tasa
 * vigente hoy, no una guardada en el pasado — así se recalcula bien
 * sin importar cuándo se termine pagando).
 *
 * @returns {number|null} la tasa a usar, o null si la forma de pago es USD directo
 */
export function tasaSegunFormaPago(st, formaPago) {
  const cfg = st.config || {};
  switch (formaPago) {
    case "BS_PARALELO": return Number(cfg.tasaParalelo) || 1;
    case "BS_BCV_EUR": return Number(cfg.tasaBcvEuro) || 1;
    case "BS_BCV": return Number(cfg.tasaBCV) || 1;
    case "BS": return Number(cfg.tasaBCV) || 1; // compatibilidad con pedidos antiguos (binario USD/BS)
    default: return null; // "USD" — sin conversión
  }
}

export const FORMAS_PAGO = [
  { id: "USD", label: "Dólares (USD)" },
  { id: "BS_BCV", label: "Bolívares — tasa BCV ($)" },
  { id: "BS_PARALELO", label: "Bolívares — tasa Paralelo" },
  { id: "BS_BCV_EUR", label: "Bolívares — tasa BCV (€)" }
];

export const tasaDe = (st, c) => Number(c.tasaBcvRegistro || st.config.tasaBCV) || 1;
export const usdComp = (st, c) => c.moneda === "USD" ? pendienteDe(st, c) : pendienteDe(st, c) / tasaDe(st, c);
export const usdPagado = (st, c) => c.moneda === "USD" ? pagadoDe(st, c) : pagadoDe(st, c) / tasaDe(st, c);

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
   ------------------------------------------------------------
   La lista real (con las etiquetas que se muestran en los <select>)
   vive en constants/theme.js — este archivo ya no define su propia
   versión para evitar que alguien importe la equivocada por error.
   ============================================================ */