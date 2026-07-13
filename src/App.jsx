import React, { useState, useEffect } from "react";

// Servicios de Autenticación y Store
import { AuthProvider, useAuth } from "./services/auth";
import { loadState, saveState, subscribeState } from "./services/store";

// Componentes Contenedores
import Login from "./Login";
import Workspace from "./Workspace";
import PantallaRecuperacion from "./PantallaRecuperacion";

// Constantes de Diseño Base
import { C } from "./constants/theme";

// Histórico de tasas (para el ticker estilo bolsa de valores)
import { conSnapshotDeHoy, hoyStr, tasaSegunFormaPago } from "./utils/finance";

// Auto-actualización diaria de tasas desde fuentes externas
import { useAutoTasas } from "./hooks/useAutoTasas";

// El estado inicial por defecto si la base de datos está totalmente vacía
const EMPTY_STATE = {
  config: { tasaBCV: "1.00", tasaIntervencion: "1.00", tasaParalelo: "1.00", tasaBcvEuro: "1.00" },
  historialTasas: {},
  tasasAutoActualizadas: null,
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
  const { user, profile, role, activo, loading: authLoading, signOut, modoRecuperacion } = useAuth();
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
  }, [user?.id, role]);

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
    marcarTasasAutoActualizadas: (fecha) => {
      setSt((prev) => {
        const next = { ...prev, tasasAutoActualizadas: fecha };
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
        const next = { ...prev, proveedores: [...(prev.proveedores || []), { ...p, id: p.id || crypto.randomUUID() }] };
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
    crearCorrida: (compromisoIds, rol, creadoPor) => {
      setSt((prev) => {
        const corrId = crypto.randomUUID();
        const correlativo = (prev.corridas || []).length + 1;
        const hoy = new Date().toISOString().slice(0, 10);
        const esMaster = rol === "MASTER";
        const nuevaCorrida = {
          id: corrId,
          codigo: `CORR-${String(correlativo).padStart(4, "0")}`,
          compromisoIds,
          estado: esMaster ? "AUTORIZADA" : "PENDIENTE_AUTORIZACION",
          fechaCreacion: hoy,
          creadoPor: creadoPor || null,
          // Si quien arma la corrida ya es Master, esa misma acción cuenta como la autorización
          autorizadoPor: esMaster ? creadoPor || null : null,
          fechaAutorizacion: esMaster ? hoy : null
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
    aprobarCorrida: (id, autorizadoPor) => {
      setSt((prev) => {
        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((co) => (co.id === id ? { ...co, estado: "AUTORIZADA", autorizadoPor: autorizadoPor || null, fechaAutorizacion: new Date().toISOString().slice(0, 10) } : co))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    rechazarCorrida: (id, rechazadoPor) => {
      setSt((prev) => {
        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((co) => (co.id === id ? { ...co, estado: "RECHAZADA", rechazadoPor: rechazadoPor || null, fechaRechazo: new Date().toISOString().slice(0, 10) } : co)),
          compromisos: (prev.compromisos || []).map((c) => (c.corridaId === id ? { ...c, corridaId: null } : c))
        };
        saveState(next, user.id).catch(console.error);
        return next;
      });
    },
    ejecutarCorrida: (id, ejecutadoPor) => {
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
            // El pedido vive en USD; la corrida se paga en Bs — convertimos con
            // la tasa que corresponda según la forma de pago de este compromiso
            // (BCV, Paralelo o Euro), igual que el pago individual manual.
            const tasaAplicable = tasaSegunFormaPago(prev, c.formaPago || c.moneda);
            const montoBs = tasaAplicable !== null ? Number(c.montoOriginal) * tasaAplicable : Number(c.montoOriginal);

            nuevosMovimientos.push({
              id: crypto.randomUUID(),
              compromisoId: c.id,
              monto: montoBs,
              moneda: "BS",
              tasaBcvPago: tasaAplicable !== null ? tasaAplicable : null,
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
                  saldoActual: Number(nuevosBancos[idx].saldoActual) - Number(montoBs)
                };
              }
            }
          });

        const next = {
          ...prev,
          corridas: (prev.corridas || []).map((x) => (x.id === id ? { ...x, estado: "EJECUTADA", ejecutadoPorAdmin: ejecutadoPor || null, fechaEjecucion: new Date().toISOString().slice(0, 10) } : x)),
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

  // Auto-actualización diaria de tasas (solo para roles que pueden editarlas)
  useAutoTasas(st, act, Boolean(role === "MASTER" || role === "TESORERIA"));

  // 3. Renderizado condicional según el estado de la sesión

  // Prioridad máxima: si llegó desde el link de "olvidé mi contraseña",
  // mostramos esa pantalla sin importar en qué otro estado esté la cuenta.
  if (modoRecuperacion) {
    return <PantallaRecuperacion />;
  }

  if (authLoading || (user && !profile) || (user && role && storeLoading)) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.paper, fontFamily: "sans-serif", color: C.mut, fontSize: 14 }}>
        Sincronizando con El Maizalito Real-Time...
      </div>
    );
  }

  // Cuenta creada pero todavía no autorizada por un Master
  if (user && profile && !activo) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: C.paper, fontFamily: "sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 420, textAlign: "center", background: "#fff", border: `1px solid ${C.line}`, borderRadius: 16, padding: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.amarSoft, color: C.amar, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>
            ⏳
          </div>
          <div style={{ fontFamily: "serif", fontSize: 19, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
            Tu cuenta está pendiente de aprobación
          </div>
          <div style={{ fontSize: 13.5, color: C.mut, lineHeight: 1.5, marginBottom: 20 }}>
            Ya te registraste con <b>{user.email}</b>. Un administrador (Master) necesita autorizar tu acceso
            y asignarte un rol antes de que puedas entrar. Te avisaremos apenas esté listo.
          </div>
          <button
            onClick={signOut}
            style={{ background: C.ink, color: "#fff", border: "none", borderRadius: 9, padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
          >
            Cerrar sesión
          </button>
        </div>
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