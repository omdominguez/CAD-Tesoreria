import { useState, useRef, useCallback } from "react";

const EMPTY_STATE = { 
  config: { tasaBCV: 40, tasaIntervencion: 42, tasaParalelo: 45, moneda: "USD" }, 
  bancos: [], 
  proveedores: [], 
  compromisos: [], 
  cuentasCobrar: [], 
  movimientos: [], 
  corridas: [], 
  cobranzas: [], 
  log: [], 
  seq: 0 
};

export function useAppStore() {
  const [st, setSt] = useState(EMPTY_STATE);
  const isLocalChange = useRef(false);

  // Helper para actualizar y avisar al autosave
  const update = useCallback((fn) => {
    isLocalChange.current = true;
    setSt((prev) => fn(prev));
  }, []);

  const act = {
    setRate: (key, v) => update(n => ({
      ...n, config: { ...n.config, [key]: v }
    })),

    // BANCOS
    addBanco: (d) => update(n => {
      const seq = n.seq + 1;
      return { ...n, seq, bancos: [...(n.bancos || []), { ...d, id: "id_" + seq }] };
    }),
    updBanco: (d) => update(n => ({
      ...n, bancos: (n.bancos || []).map(b => b.id === d.id ? d : b)
    })),
    delBanco: (id) => update(n => ({
      ...n, bancos: (n.bancos || []).filter(b => b.id !== id)
    })),

    // PROVEEDORES / CLIENTES
    addProv: (d) => update(n => {
      const seq = n.seq + 1;
      return { ...n, seq, proveedores: [...(n.proveedores || []), { ...d, id: "id_" + seq }] };
    }),
    updProv: (d) => update(n => ({
      ...n, proveedores: (n.proveedores || []).map(p => p.id === d.id ? { ...p, ...d } : p)
    })),
    delProv: (id) => update(n => ({
      ...n, proveedores: (n.proveedores || []).filter(p => p.id !== id)
    })),

    // CUENTAS POR COBRAR
    addCxC: (d) => update(n => {
      const seq = n.seq + 1;
      return { 
        ...n, seq, 
        cuentasCobrar: [...(n.cuentasCobrar || []), { ...d, id: "id_" + seq, anulado: false, tasaBcvRegistro: d.moneda === "BS" ? n.config.tasaBCV : null }] 
      };
    }),
    delCxC: (id) => update(n => ({
      ...n, cuentasCobrar: (n.cuentasCobrar || []).filter(c => c.id !== id)
    })),

    // COBRANZAS (Modifican el saldo del banco destino)
    addCobranza: (d) => update(n => {
      const seq = n.seq + 1;
      return {
        ...n, seq,
        cobranzas: [...(n.cobranzas || []), { ...d, id: "id_" + seq }],
        bancos: (n.bancos || []).map(b => 
          b.id === d.bancoDestinoId ? { ...b, saldoActual: Number(b.saldoActual) + Number(d.monto) } : b
        )
      };
    }),
    delCobranza: (id) => update(n => {
      const cob = (n.cobranzas || []).find(c => c.id === id);
      if (!cob) return n;
      return {
        ...n,
        cobranzas: n.cobranzas.filter(c => c.id !== id),
        bancos: (n.bancos || []).map(b => 
          b.id === cob.bancoDestinoId ? { ...b, saldoActual: Number(b.saldoActual) - Number(cob.monto) } : b
        )
      };
    }),

    // COMPROMISOS (Compras)
    addCompromisoMulti: (lista) => update(n => {
      let currentSeq = n.seq;
      const nuevosCompromisos = [];
      const nuevosMovimientos = [];

      lista.forEach(obj => {
        currentSeq++;
        const id = "id_" + currentSeq;
        const d = obj.data;
        
        nuevosCompromisos.push({ 
          ...d, id, anulado: false, corridaId: null, bancoAsignadoId: d.bancoAsignadoId || null, tasaBcvRegistro: d.moneda === "BS" ? n.config.tasaBCV : null 
        });

        if (obj.anticipo && Number(obj.anticipo.monto) > 0) {
          currentSeq++;
          nuevosMovimientos.push({
            id: "id_" + currentSeq, compromisoId: id, tipo: obj.anticipo.tipo || "ANTICIPO",
            monto: Number(obj.anticipo.monto), moneda: d.moneda, bancoOrigenId: obj.anticipo.bancoOrigenId || null,
            fecha: obj.anticipo.fecha || new Date().toISOString().slice(0, 10), referencia: obj.anticipo.referencia || ""
          });
        }
      });

      return {
        ...n, seq: currentSeq,
        compromisos: [...(n.compromisos || []), ...nuevosCompromisos],
        movimientos: [...(n.movimientos || []), ...nuevosMovimientos]
      };
    }),
    delCompromiso: (id) => update(n => ({
      ...n, compromisos: (n.compromisos || []).filter(c => c.id !== id)
    })),
    setAdjCompromiso: (id, adjuntos) => update(n => ({
      ...n, compromisos: (n.compromisos || []).map(c => c.id === id ? { ...c, adjuntos } : c)
    })),
    asignar: (id, bancoId, prioridad) => update(n => ({
      ...n, compromisos: (n.compromisos || []).map(c => c.id === id ? { ...c, bancoAsignadoId: bancoId || null, prioridad } : c)
    })),
    
    // PAGOS A PROVEEDORES
    addMovimiento: (d) => update(n => {
      const seq = n.seq + 1;
      return {
        ...n, seq,
        movimientos: [...(n.movimientos || []), { ...d, id: "id_" + seq, fecha: d.fecha || new Date().toISOString().slice(0, 10) }]
      };
    }),

    // CORRIDAS DE PAGO (Lotes)
    crearCorrida: (ids, usuario) => update(n => {
      const seq = n.seq + 1;
      const cid = "id_" + seq;
      const codigo = "CP-" + new Date().getFullYear() + "-" + String((n.corridas || []).length + 1).padStart(3, "0");
      
      return {
        ...n, seq,
        corridas: [...(n.corridas || []), {
          id: cid, codigo, moneda: "BS", estado: "PENDIENTE_AUTORIZACION", creadoPor: usuario, 
          fechaCreacion: new Date().toISOString().slice(0, 10), autorizadoPor: null, fechaAutorizacion: null, compromisoIds: ids
        }],
        compromisos: (n.compromisos || []).map(c => ids.includes(c.id) ? { ...c, corridaId: cid } : c)
      };
    }),
    aprobarCorrida: (id, usuario) => update(n => ({
      ...n, corridas: (n.corridas || []).map(c => 
        c.id === id ? { ...c, estado: "AUTORIZADA", autorizadoPor: usuario, fechaAutorizacion: new Date().toISOString().slice(0, 10) } : c
      )
    })),
    rechazarCorrida: (id) => update(n => {
      const co = (n.corridas || []).find(c => c.id === id);
      return {
        ...n,
        corridas: (n.corridas || []).map(c => c.id === id ? { ...c, estado: "RECHAZADA" } : c),
        compromisos: (n.compromisos || []).map(c => co?.compromisoIds.includes(c.id) ? { ...c, corridaId: null } : c)
      };
    }),
    ejecutarCorrida: (id) => update(n => {
      const co = (n.corridas || []).find(c => c.id === id);
      if (!co) return n;

      let currentSeq = n.seq;
      const nuevosMovs = [];

      co.compromisoIds.forEach(cid => {
        const c = (n.compromisos || []).find(x => x.id === cid);
        if (!c) return;
        
        const pagado = (n.movimientos || []).filter(m => m.compromisoId === cid).reduce((a, m) => a + Number(m.monto), 0);
        const pend = c.montoOriginal - pagado;
        
        if (pend > 0) {
          currentSeq++;
          nuevosMovs.push({
            id: "id_" + currentSeq, compromisoId: cid, tipo: "TRANSFERENCIA", monto: pend, 
            moneda: c.moneda, bancoOrigenId: c.bancoAsignadoId, fecha: new Date().toISOString().slice(0, 10), referencia: co.codigo
          });
        }
      });

      return {
        ...n, seq: currentSeq,
        corridas: (n.corridas || []).map(c => c.id === id ? { ...c, estado: "EJECUTADA" } : c),
        movimientos: [...(n.movimientos || []), ...nuevosMovs]
      };
    })
  };

  return { st, setSt, act, isLocalChange };
}