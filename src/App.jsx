import React, { useState, useEffect } from "react";

// Servicios de Autenticación y Store
import { AuthProvider, useAuth } from "./services/auth";
import { loadState, saveState, subscribeState } from "./services/store";

// Componentes Contenedores
import Login from "./Login";
import Workspace from "./Workspace";

// Constantes de Diseño Base
import { C } from "./constants/theme";

// Histórico de tasas (para el ticker estilo bolsa de valores)
import { conSnapshotDeHoy, hoyStr } from "./utils/finance";

// El estado inicial por defecto si la base de datos está totalmente vacía
const EMPTY_STATE = {
  config: { tasaBCV: "1.00", tasaIntervencion: "1.00", tasaParalelo: "1.00" },
  historialTasas: {},
  bancos: [],
  proveedores: [],
  compromisos: [],
  movimientos: [],
  cuentasCobrar: [],
  cobranzas: [],
  corridas: []
};

/* ============================================================
   INNER APP: Maneja la lógica operativa una vez resuelto el Auth
   ============================================================ */
function InnerApp() {
  const { user, role, loading: authLoading } = useAuth();
  const [st, setSt] = useState(null);
  const [storeLoading, setStoreLoading] = useState(true);

  // 1. Efecto para cargar el estado inicial y suscribirse al Real-Time de Supabase
  useEffect(() => {
    if (!user || !role) {
      setSt(null);
      return;
    }

    setStoreLoading(true);

    // Carga inicial del JSON desde la tabla 'app_state'
    loadState()
      .then((dbState) => {
        const base = dbState || EMPTY_STATE;
        // Si hoy todavía no tiene una foto de las tasas guardada, la registramos
        // ahora mismo (así el ticker siempre tiene con qué comparar el día
        // anterior, incluso si nadie editó las tasas hoy).
        const yaTieneHoy = Boolean(base.historialTasas?.[hoyStr()]);
        const conHistorial = yaTieneHoy ? base : conSnapshotDeHoy(base);
        setSt(conHistorial);
        setStoreLoading(false);
        if (!yaTieneHoy) saveState(conHistorial, user.id).catch(console.error);
      })
      .catch((err) => {
        console.error("Error crítico cargando estado:", err);
        setSt(EMPTY_STATE);
        setStoreLoading(false);
      });

    // Suscripción en tiempo real: si otro usuario edita algo, impacta aquí de inmediato
    const unsubscribe = subscribeState((newState) => {
      if (newState) setSt(newState);
    });

    return () => {
      unsubscribe();
    };
  }, [user, role]);

  // 2. Orquestador de Acciones Globales (Mutadores del Estado)
  // Despacha los cambios localmente y los persiste de inmediato en Supabase
  const act = {
    // === CONFIGURACIÓN ===
    setRate: (key, val) => {
      setSt((prev) => {
        const conConfig = { ...prev, config: { ...prev.config, [key]: val } };
        const next = conSnapshotDeHoy(conConfig);
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === BANCOS ===
    addBanco: (bco) => {
      setSt((prev) => {
        const next = { ...prev, bancos: [...(prev.bancos || []), { ...bco, id: crypto.randomUUID() }] };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    updBanco: (bco) => {
      setSt((prev) => {
        const next = { ...prev, bancos: (prev.bancos || []).map((b) => (b.id === bco.id ? bco : b)) };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    delBanco: (id) => {
      if (!window.confirm("¿Seguro que deseas eliminar esta cuenta bancaria?")) return;
      setSt((prev) => {
        const next = { ...prev, bancos: (prev.bancos || []).filter((b) => b.id !== id) };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === CONTACTOS (PROVEEDORES / CLIENTES) ===
    addProv: (p) => {
      setSt((prev) => {
        const next = { ...prev, proveedores: [...(prev.proveedores || []), { ...p, id: crypto.randomUUID() }] };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    updProv: (p) => {
      setSt((prev) => {
        const next = { ...prev, proveedores: (prev.proveedores || []).map((x) => (x.id === p.id ? p : x)) };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    delProv: (id) => {
      if (!window.confirm("¿Eliminar este contacto del directorio?")) return;
      setSt((prev) => {
        const next = { ...prev, proveedores: (prev.proveedores || []).filter((x) => x.id !== id) };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === COMPROMISOS (CUENTAS POR PAGAR — COMPRAS) ===
    addCompromisoMulti: (listaCuotas) => {
      setSt((prev) => {
        const nuevosCompromisos = [...(prev.compromisos || [])];
        const nuevosMovimientos = [...(prev.movimientos || [])];
        const nuevosBancos = [...(prev.bancos || [])];

        listaCuotas.forEach(({ data, anticipo }) => {
          const compId = crypto.randomUUID();
          nuevosCompromisos.push({ ...data, id: compId, anulado: false, corridaId: null });

          if (anticipo) {
            const movId = crypto.randomUUID();
            nuevosMovimientos.push({
              id: movId,
              compromisoId: compId,
              monto: anticipo.monto,
              fecha: anticipo.fecha,
              tipo: anticipo.tipo,
              bancoOrigenId: anticipo.bancoOrigenId,
              referencia: anticipo.referencia,
              adjuntos: []
            });

            if (anticipo.bancoOrigenId) {
              const bIndex = nuevosBancos.findIndex((b) => b.id === anticipo.bancoOrigenId);
              if (bIndex !== -1) {
                nuevosBancos[bIndex] = {
                  ...nuevosBancos[bIndex],
                  saldoActual: Number(nuevosBancos[bIndex].saldoActual) - Number(anticipo.monto)
                };
              }
            }
          }
        });

        const next = { ...prev, compromisos: nuevosCompromisos, movimientos: nuevosMovimientos, bancos: nuevosBancos };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    setAdjCompromiso: (id, adjuntos) => {
      setSt((prev) => {
        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) => (c.id === id ? { ...c, adjuntos } : c))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    delCompromiso: (id) => {
      if (!window.confirm("¿Anular este compromiso de pago?")) return;
      setSt((prev) => {
        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) => (c.id === id ? { ...c, anulado: true } : c))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === TESORERÍA: PAGOS A PROVEEDORES ===
    asignar: (id, bancoAsignadoId, prioridad) => {
      setSt((prev) => {
        const next = {
          ...prev,
          compromisos: (prev.compromisos || []).map((c) => (c.id === id ? { ...c, bancoAsignadoId, prioridad } : c))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    addMovimiento: (mov) => {
      setSt((prev) => {
        const nuevosMovimientos = [...(prev.movimientos || []), { ...mov, id: crypto.randomUUID() }];
        const nuevosBancos = (prev.bancos || []).map((b) => {
          if (mov.tipo !== "CRUCE" && b.id === mov.bancoOrigenId) {
            return { ...b, saldoActual: Number(b.saldoActual) - Number(mov.monto) };
          }
          return b;
        });

        const next = { ...prev, movimientos: nuevosMovimientos, bancos: nuevosBancos };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === TESORERÍA: CORRIDAS DE PAGO (LOTES EN BS) ===
    crearCorrida: (compromisoIds, rol) => {
      setSt((prev) => {
        const corrId = crypto.randomUUID();
        const correlativo = (prev.corridas || []).length + 1;
        const nuevaCorrida = {
          id: corrId,
          codigo: `CORR-${String(correlativo).padStart(4, "0")}`,
          compromisoIds,
          estado: rol === "MASTER" ? "AUTORIZADA" : "PENDIENTE_AUTORIZACION",
          fechaCreacion: new Date().toISOString().slice(0, 10)
        };

        const nuevosCompromisos = (prev.compromisos || []).map((c) =>
          compromisoIds.includes(c.id) ? { ...c, corridaId: corrId } : c
        );

        const next = {
          ...prev,
          corridas: [...(prev.corridas || []), nuevaCorrida],
          compromisos: nuevosCompromisos
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    aprobarCorrida: (id) => {
      setSt((prev) => {
        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((co) => (co.id === id ? { ...co, estado: "AUTORIZADA" } : co))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    rechazarCorrida: (id) => {
      setSt((prev) => {
        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((co) => (co.id === id ? { ...co, estado: "RECHAZADA" } : co)),
          compromisos: (prev.compromisos || []).map((c) => (c.corridaId === id ? { ...c, corridaId: null } : c))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    ejecutarCorrida: (id) => {
      setSt((prev) => {
        const co = (prev.corridas || []).find((x) => x.id === id);
        if (!co) return prev;

        const nuevosMovimientos = [...(prev.movimientos || [])];
        const nuevosBancos = [...(prev.bancos || [])];

        // Se asume un banco por defecto en Bs asignado a los compromisos o el primero disponible
        (prev.compromisos || [])
          .filter((c) => co.compromisoIds.includes(c.id))
          .forEach((c) => {
            const bId = c.bancoAsignadoId || (prev.bancos || []).find((b) => b.moneda === "BS")?.id;
            const montoPend = c.montoOriginal; // Simplificado al total del compromiso

            nuevosMovimientos.push({
              id: crypto.randomUUID(),
              compromisoId: c.id,
              monto: montoPend,
              fecha: new Date().toISOString().slice(0, 10),
              tipo: "TRANSFERENCIA",
              bancoOrigenId: bId,
              referencia: `Ejecución Lote ${co.codigo}`,
              adjuntos: []
            });

            if (bId) {
              const idx = nuevosBancos.findIndex((b) => b.id === bId);
              if (idx !== -1) {
                nuevosBancos[idx] = {
                  ...nuevosBancos[idx],
                  saldoActual: Number(nuevosBancos[idx].saldoActual) - Number(montoPend)
                };
              }
            }
          });

        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((x) => (x.id === id ? { ...x, estado: "EJECUTADA" } : x)),
          movimientos: nuevosMovimientos,
          bancos: nuevosBancos
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === CUENTAS POR COBRAR (VENTAS) ===
    addCxC: (cxc) => {
      setSt((prev) => {
        const next = {
          ...prev,
          cuentasCobrar: [...(prev.cuentasCobrar || []), { ...cxc, id: crypto.randomUUID(), anulado: false }]
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    delCxC: (id) => {
      if (!window.confirm("¿Seguro que deseas anular esta factura de venta?")) return;
      setSt((prev) => {
        const next = {
          ...prev,
          cuentasCobrar: (prev.cuentasCobrar || []).map((c) => (c.id === id ? { ...c, anulado: true } : c))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },

    // === COBRANZAS (INGRESOS DE CLIENTES) ===
    addCobranza: (cob) => {
      setSt((prev) => {
        const next = {
          ...prev,
          cobranzas: [...(prev.cobranzas || []), { ...cob, id: crypto.randomUUID() }],
          bancos: (prev.bancos || []).map((b) =>
            b.id === cob.bancoDestinoId ? { ...b, saldoActual: Number(b.saldoActual) + Number(cob.monto) } : b
          )
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    delCobranza: (id) => {
      setSt((prev) => {
        const target = (prev.cobranzas || []).find((c) => c.id === id);
        if (!target) return prev;

        const next = {
          ...prev,
          cobranzas: (prev.cobranzas || []).filter((c) => c.id !== id),
          bancos: (prev.bancos || []).map((b) =>
            b.id === target.bancoDestinoId ? { ...b, saldoActual: Number(b.saldoActual) - Number(target.monto) } : b
          )
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    }
  };

  // 3. Renderizado condicional según el estado de la sesión
  if (authLoading || (user && role && storeLoading)) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.paper, fontFamily: "sans-serif", color: C.mut, fontSize: 14 }}>
        Sincronizando con El Maizalito Real-Time...
      </div>
    );
  }

  return user && role && st ? <Workspace st={st} act={act} /> : <Login />;
}

/* ============================================================
   EXPORT CENTRAL: Envoltorio del AuthProvider
   ============================================================ */
export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}