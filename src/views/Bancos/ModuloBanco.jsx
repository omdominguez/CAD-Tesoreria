import React, { useState, useMemo, useRef } from "react";
import { Landmark, ArrowUpRight, ArrowDownLeft, CheckCircle2, Circle, ClipboardCheck, Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { money, fmtD, construirLedgerBanco, bancosOrdenados, brutoUSD } from "../../utils/finance";
import { exportarCSV, exportarExcel, exportarPDF } from "../../utils/exportar";
import { usePaged } from "../../hooks/usePaged";

import { AvatarBanco } from "../../components/shared/AvatarBanco";
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Select, Input, Field } from "../../components/ui/Forms";
import { Btn, Segmented } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";
import { ExportMenu } from "../../components/ui/ExportMenu";

const hoyStr = () => new Date().toISOString().slice(0, 10);

export default function ModuloBanco({ st, act, rol, usuario }) {
  const bancos = bancosOrdenados(st);
  const puedeConciliar = rol === "TESORERIA" || rol === "MASTER";

  const [bancoId, setBancoId] = useState(bancos[0]?.id || "");
  const [tab, setTab] = useState("movimientos");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [modalConciliacion, setModalConciliacion] = useState(false);
  const [verConciliacion, setVerConciliacion] = useState(null);

  const bancoSel = bancos.find((b) => b.id === bancoId);
  const ledgerCompleto = useMemo(() => construirLedgerBanco(st, bancoId), [st, bancoId]);

  const ledgerFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ledgerCompleto.filter((r) => {
      if (filtroTipo !== "TODOS" && r.tipo !== filtroTipo) return false;
      if (filtroEstado === "CONCILIADOS" && !r.conciliado) return false;
      if (filtroEstado === "PENDIENTES" && r.conciliado) return false;
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      if (q && !`${r.concepto} ${r.detalle} ${r.referencia}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ledgerCompleto, filtroTipo, filtroEstado, desde, hasta, busqueda]);

  const totalIngresos = ledgerCompleto.filter((r) => r.tipo === "CREDITO").reduce((a, r) => a + r.monto, 0);
  const totalEgresos = ledgerCompleto.filter((r) => r.tipo === "DEBITO").reduce((a, r) => a + r.monto, 0);
  const saldoConciliado =
    Number(bancoSel?.saldoInicial || 0) +
    ledgerCompleto.filter((r) => r.conciliado).reduce((a, r) => a + (r.tipo === "CREDITO" ? r.monto : -r.monto), 0);
  const diferenciaPorConciliar = Number(bancoSel?.saldoActual || 0) - saldoConciliado;

  const pg = usePaged(ledgerFiltrado, 15);

  const toggleSeleccion = (id) => setSeleccion((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const marcarSeleccionComoConciliada = (valor) => {
    const movs = ledgerFiltrado.filter((r) => seleccion.includes(r.id) && r.origen === "movimiento").map((r) => r.idOriginal);
    const cobs = ledgerFiltrado.filter((r) => seleccion.includes(r.id) && r.origen === "cobranza").map((r) => r.idOriginal);
    if (movs.length) act.marcarConciliadoLote("movimiento", movs, valor);
    if (cobs.length) act.marcarConciliadoLote("cobranza", cobs, valor);
    setSeleccion([]);
  };

  const columnasExport = [
    { key: "fecha", label: "Fecha" },
    { key: "concepto", label: "Concepto" },
    { key: "detalle", label: "Detalle" },
    { key: "referencia", label: "Referencia" },
    { key: "egreso", label: "Egreso" },
    { key: "ingreso", label: "Ingreso" },
    { key: "saldo", label: "Saldo" },
    { key: "estado", label: "Conciliado" }
  ];
  const filasExport = () => ledgerFiltrado.map((r) => ({
    fecha: fmtD(r.fecha),
    concepto: r.concepto,
    detalle: r.detalle,
    referencia: r.referencia,
    egreso: r.tipo === "DEBITO" ? money(r.monto, bancoSel?.moneda) : "",
    ingreso: r.tipo === "CREDITO" ? money(r.monto, bancoSel?.moneda) : "",
    saldo: money(r.saldoProgresivo, bancoSel?.moneda),
    estado: r.conciliado ? "Sí" : "No"
  }));
  const exportar = async (formato) => {
    const nombre = `movimientos_${(bancoSel?.nombre || "banco").toLowerCase().replace(/\s+/g, "_")}`;
    if (formato === "csv") return exportarCSV(nombre, columnasExport, filasExport());
    if (formato === "excel") return exportarExcel(nombre, columnasExport, filasExport(), "Movimientos");
    if (formato === "pdf") {
      return exportarPDF(nombre, columnasExport, filasExport(), {
        titulo: `Movimientos — ${bancoSel?.nombre || ""}`,
        subtitulo: `Saldo en libros: ${money(bancoSel?.saldoActual, bancoSel?.moneda)} · generado ${fmtD(hoyStr())}`
      });
    }
  };

  const conciliaciones = [...(st.conciliaciones || [])].filter((c) => c.bancoId === bancoId).reverse();

  if (bancos.length === 0) {
    return (
      <Empty icon={Landmark} title="Sin cuentas bancarias" msg="Registra una cuenta en Ajustes → Bancos primero." />
    );
  }

  return (
    <Section
      title="Banco"
      desc="Movimientos completos de cada cuenta y conciliación contra el estado de cuenta real."
    >
      <SelectorBancos bancos={bancos} bancoId={bancoId} st={st} onSelect={(id) => { setBancoId(id); setSeleccion([]); }} />

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { id: "movimientos", label: "Movimientos" },
            { id: "conciliacion", label: "Conciliación" }
          ]}
        />
      </div>

      <Card style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <Kpi etiqueta="Saldo en libros" valor={money(bancoSel?.saldoActual, bancoSel?.moneda)} color={C.ink} />
          <Kpi etiqueta="Saldo conciliado" valor={money(saldoConciliado, bancoSel?.moneda)} color={C.verde} />
          <Kpi etiqueta="Diferencia por conciliar" valor={money(diferenciaPorConciliar, bancoSel?.moneda)} color={diferenciaPorConciliar === 0 ? C.verde : C.amar} />
          <Kpi etiqueta="Ingresos totales" valor={money(totalIngresos, bancoSel?.moneda)} color={C.verde} icono={ArrowDownLeft} />
          <Kpi etiqueta="Egresos totales" valor={money(totalEgresos, bancoSel?.moneda)} color={C.rojo} icono={ArrowUpRight} borde={false} />
        </div>
      </Card>

      {puedeConciliar && diferenciaPorConciliar !== 0 && ledgerCompleto.length > 0 && ledgerCompleto.every((r) => r.conciliado) && (
        <Card style={{ padding: "14px 18px", marginBottom: 20, borderLeft: `3px solid ${C.amar}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240, fontSize: 13, color: C.ink, lineHeight: 1.5 }}>
              Todos los movimientos de esta cuenta ya están conciliados, pero el <b>Saldo en libros</b> no
              coincide con el <b>Saldo conciliado</b>. Es probable que el saldo del banco se haya editado a
              mano en Ajustes → Bancos en algún momento. Puedes recalcularlo desde el libro de movimientos.
            </div>
            <Btn small onClick={() => act.recalcularSaldoBanco(bancoId)}>
              Recalcular saldo desde el libro
            </Btn>
          </div>
        </Card>
      )}

      {tab === "movimientos" ? (
        <>
          <Card style={{ padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 220px" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: C.mut }} />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por concepto o referencia..."
                  style={{ paddingLeft: 30, marginBottom: 0 }}
                />
              </div>
              <Segmented
                value={filtroTipo}
                onChange={setFiltroTipo}
                options={[
                  { id: "TODOS", label: "Todos" },
                  { id: "CREDITO", label: "Ingresos" },
                  { id: "DEBITO", label: "Egresos" }
                ]}
              />
              <Segmented
                value={filtroEstado}
                onChange={setFiltroEstado}
                options={[
                  { id: "TODOS", label: "Todos" },
                  { id: "PENDIENTES", label: "Pendientes" },
                  { id: "CONCILIADOS", label: "Conciliados" }
                ]}
              />
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={{ marginBottom: 0, width: 145 }} />
              <span style={{ color: C.mut, fontSize: 12 }}>a</span>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ marginBottom: 0, width: 145 }} />
              <div style={{ marginLeft: "auto" }}>
                <ExportMenu onExport={exportar} disabled={ledgerFiltrado.length === 0} />
              </div>
            </div>
          </Card>

          {seleccion.length > 0 && puedeConciliar && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.greenSoft, padding: "9px 14px", borderRadius: 10, marginBottom: 12, fontSize: 12.5 }}>
              <span>{seleccion.length} seleccionado(s)</span>
              <Btn small onClick={() => marcarSeleccionComoConciliada(true)}>
                <CheckCircle2 size={13} /> Marcar como conciliados
              </Btn>
              <Btn small variant="ghost" onClick={() => marcarSeleccionComoConciliada(false)}>
                Desmarcar
              </Btn>
              <Btn small variant="ghost" onClick={() => setSeleccion([])}>Cancelar</Btn>
            </div>
          )}

          {ledgerFiltrado.length === 0 ? (
            <Card style={{ textAlign: "center", padding: "40px 20px", color: C.mut, fontSize: 13.5 }}>
              No hay movimientos que coincidan con los filtros.
            </Card>
          ) : (
            <Card>
              <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {puedeConciliar && <Th></Th>}
                      <Th>Fecha</Th>
                      <Th>Concepto / Detalle</Th>
                      <Th>Referencia</Th>
                      <Th right>Egreso</Th>
                      <Th right>Ingreso</Th>
                      <Th right>Saldo</Th>
                      <Th>Estado</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.slice.map((r) => (
                      <tr key={r.id} style={{ background: seleccion.includes(r.id) ? C.greenSoft : "transparent" }}>
                        {puedeConciliar && (
                          <Td>
                            <input type="checkbox" checked={seleccion.includes(r.id)} onChange={() => toggleSeleccion(r.id)} />
                          </Td>
                        )}
                        <Td>{fmtD(r.fecha)}</Td>
                        <Td>
                          <div style={{ fontWeight: 700, color: C.ink }}>{r.concepto}</div>
                          <div style={{ fontSize: 11.5, color: C.mut }}>{r.detalle}</div>
                        </Td>
                        <Td><Badge tone="mut">{r.referencia}</Badge></Td>
                        <Td right>
                          {r.tipo === "DEBITO" ? (
                            <span style={{ color: C.rojo, fontWeight: 600 }}>{money(r.monto, bancoSel?.moneda)}</span>
                          ) : "—"}
                        </Td>
                        <Td right>
                          {r.tipo === "CREDITO" ? (
                            <span style={{ color: C.verde, fontWeight: 600 }}>{money(r.monto, bancoSel?.moneda)}</span>
                          ) : "—"}
                        </Td>
                        <Td right bold style={{ fontVariantNumeric: "tabular-nums" }}>
                          {money(r.saldoProgresivo, bancoSel?.moneda)}
                        </Td>
                        <Td>
                          {puedeConciliar ? (
                            <button
                              onClick={() => act.marcarConciliado(r.origen, r.idOriginal, !r.conciliado)}
                              style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, color: r.conciliado ? C.verde : C.mut, fontSize: 12, fontWeight: 600, padding: 0 }}
                            >
                              {r.conciliado ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                              {r.conciliado ? "Conciliado" : "Pendiente"}
                            </button>
                          ) : (
                            <Badge tone={r.conciliado ? "verde" : "mut"}>{r.conciliado ? "Conciliado" : "Pendiente"}</Badge>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pg={pg} />
            </Card>
          )}
        </>
      ) : (
        <>
          {puedeConciliar && (
            <div style={{ marginBottom: 14 }}>
              <Btn onClick={() => setModalConciliacion(true)}>
                <Plus size={15} /> Nueva conciliación
              </Btn>
            </div>
          )}

          {conciliaciones.length === 0 ? (
            <Empty icon={ClipboardCheck} title="Sin conciliaciones registradas" msg="Cierra el mes comparando el saldo del sistema contra el estado de cuenta real del banco." />
          ) : (
            <Card>
              <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <Th>Fecha de corte</Th>
                      <Th right>Según banco</Th>
                      <Th right>Según sistema</Th>
                      <Th right>Diferencia</Th>
                      <Th>Estado</Th>
                      <Th>Hecha por</Th>
                      <Th right>Acciones</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {conciliaciones.map((c) => (
                      <tr key={c.id}>
                        <Td bold>{fmtD(c.fechaCorte)}</Td>
                        <Td right>{money(c.saldoSegunBanco, bancoSel?.moneda)}</Td>
                        <Td right>{money(c.saldoSegunSistema, bancoSel?.moneda)}</Td>
                        <Td right bold style={{ color: c.diferencia === 0 ? C.verde : C.amar }}>
                          {money(c.diferencia, bancoSel?.moneda)}
                        </Td>
                        <Td><Badge tone={c.diferencia === 0 ? "verde" : "amar"}>{c.diferencia === 0 ? "Cuadra" : "Con diferencia"}</Badge></Td>
                        <Td>{c.creadoPor || "—"}</Td>
                        <Td right>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <Btn small variant="ghost" onClick={() => setVerConciliacion(c)}>Ver</Btn>
                            {puedeConciliar && (
                              <Btn small variant="danger" onClick={() => act.eliminarConciliacion(c.id)}>
                                <Trash2 size={13} />
                              </Btn>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {modalConciliacion && (
        <NuevaConciliacionModal
          banco={bancoSel}
          ledgerCompleto={ledgerCompleto}
          usuario={usuario}
          onClose={() => setModalConciliacion(false)}
          onSave={(registro) => { act.guardarConciliacion(registro); setModalConciliacion(false); }}
        />
      )}

      {verConciliacion && (
        <DetalleConciliacionModal
          conciliacion={verConciliacion}
          banco={bancoSel}
          ledgerCompleto={ledgerCompleto}
          onClose={() => setVerConciliacion(null)}
        />
      )}
    </Section>
  );
}

function Kpi({ etiqueta, valor, color, icono: Icono, borde = true }) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 170, padding: "16px 18px", borderRight: borde ? `1px solid ${C.line}` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {Icono && <Icono size={13} color={color} />}
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3 }}>{etiqueta}</div>
      </div>
      <div style={{ fontFamily: FONTS.SANS, fontSize: 19, fontWeight: 800, color, letterSpacing: -0.4 }}>{valor}</div>
    </div>
  );
}

function NuevaConciliacionModal({ banco, ledgerCompleto, usuario, onClose, onSave }) {
  const [fechaCorte, setFechaCorte] = useState(hoyStr());
  const [saldoSegunBanco, setSaldoSegunBanco] = useState("");
  const [notas, setNotas] = useState("");

  const filaDeCorte = ledgerCompleto.find((r) => r.fecha <= fechaCorte);
  const saldoSegunSistema = filaDeCorte ? filaDeCorte.saldoProgresivo : Number(banco?.saldoInicial || 0);

  const pendientesHastaCorte = ledgerCompleto.filter((r) => !r.conciliado && r.fecha <= fechaCorte);

  const diferencia = saldoSegunBanco !== "" ? Number(saldoSegunBanco) - saldoSegunSistema : null;

  const guardar = () => {
    if (saldoSegunBanco === "" || !fechaCorte) return;
    onSave({
      bancoId: banco.id,
      fechaCorte,
      saldoSegunBanco: Number(saldoSegunBanco),
      saldoSegunSistema,
      diferencia: Number((Number(saldoSegunBanco) - saldoSegunSistema).toFixed(2)),
      notas,
      creadoPor: usuario,
      fechaCreacion: hoyStr()
    });
  };

  return (
    <Modal title={`Nueva conciliación · ${banco?.nombre}`} onClose={onClose}>
      <Field label="Fecha de corte (según tu estado de cuenta)">
        <Input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} />
      </Field>

      <Field label="Saldo según el estado de cuenta del banco">
        <Input type="number" value={saldoSegunBanco} onChange={(e) => setSaldoSegunBanco(e.target.value)} placeholder="0.00" />
      </Field>

      <div style={{ background: C.body, padding: "10px 14px", borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ color: C.mut }}>Saldo según el sistema a esa fecha</span>
          <b style={{ color: C.ink }}>{money(saldoSegunSistema, banco?.moneda)}</b>
        </div>
        {diferencia !== null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.mut }}>Diferencia</span>
            <b style={{ color: diferencia === 0 ? C.verde : C.amar }}>{money(diferencia, banco?.moneda)}</b>
          </div>
        )}
      </div>

      {pendientesHastaCorte.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 6 }}>
            {pendientesHastaCorte.length} movimiento(s) sin marcar como conciliados hasta esta fecha — podrían explicar la diferencia:
          </div>
          <div style={{ maxHeight: 140, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 10 }}>
            {pendientesHastaCorte.slice(0, 20).map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.mut }}>{fmtD(r.fecha)} · {r.concepto}</span>
                <span style={{ fontWeight: 600, color: r.tipo === "DEBITO" ? C.rojo : C.verde }}>
                  {r.tipo === "DEBITO" ? "-" : "+"}{money(r.monto, banco?.moneda)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Field label="Notas (opcional)">
        <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. diferencia por cheque en tránsito..." />
      </Field>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar}>Guardar conciliación</Btn>
      </div>
    </Modal>
  );
}

function DetalleConciliacionModal({ conciliacion, banco, ledgerCompleto, onClose }) {
  const pendientesEsaFecha = ledgerCompleto.filter((r) => !r.conciliado && r.fecha <= conciliacion.fechaCorte);

  return (
    <Modal title={`Conciliación al ${fmtD(conciliacion.fechaCorte)}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={{ background: C.body, padding: "10px 14px", borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>SEGÚN BANCO</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{money(conciliacion.saldoSegunBanco, banco?.moneda)}</div>
        </div>
        <div style={{ background: C.body, padding: "10px 14px", borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>SEGÚN SISTEMA</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{money(conciliacion.saldoSegunSistema, banco?.moneda)}</div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "10px 14px", background: conciliacion.diferencia === 0 ? C.greenSoft : C.amarSoft, borderRadius: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: conciliacion.diferencia === 0 ? C.greenDk : C.amar, textTransform: "uppercase" }}>Diferencia</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: conciliacion.diferencia === 0 ? C.greenDk : C.amar }}>
          {money(conciliacion.diferencia, banco?.moneda)}
        </div>
      </div>

      {conciliacion.notas && (
        <div style={{ fontSize: 13, color: C.ink, marginBottom: 14 }}>
          <b>Notas:</b> {conciliacion.notas}
        </div>
      )}

      <div style={{ fontSize: 12, color: C.mut, marginBottom: 10 }}>
        Hecha por <b>{conciliacion.creadoPor || "—"}</b> el {fmtD(conciliacion.fechaCreacion)}
      </div>

      {pendientesEsaFecha.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mut, marginBottom: 6 }}>
            Movimientos que seguían pendientes de conciliar en ese corte:
          </div>
          <div style={{ maxHeight: 160, overflowY: "auto", border: `1px solid ${C.line}`, borderRadius: 10 }}>
            {pendientesEsaFecha.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", fontSize: 12, borderBottom: `1px solid ${C.line}` }}>
                <span style={{ color: C.mut }}>{fmtD(r.fecha)} · {r.concepto}</span>
                <span style={{ fontWeight: 600, color: r.tipo === "DEBITO" ? C.rojo : C.verde }}>
                  {r.tipo === "DEBITO" ? "-" : "+"}{money(r.monto, banco?.moneda)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

/* ============================================================
   SELECTOR DE BANCOS: tira deslizable de tarjetas
   ------------------------------------------------------------
   Reemplaza el desplegable de toda la vida por tarjetas con
   logo, nombre, moneda y disponible neto — se ve el conjunto de
   un vistazo, sin desplegar nada y sin ocupar una lista larga.
   Con pocas cuentas cabe todo; con muchas, se desliza con las
   flechas o arrastrando (como el carrusel del Tablero).
   ============================================================ */
function SelectorBancos({ bancos, bancoId, st, onSelect }) {
  const scrollRef = useRef(null);

  const desplazar = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <button onClick={() => desplazar(-1)} aria-label="Anterior" style={flechaBancoEstilo}>
        <ChevronLeft size={16} />
      </button>

      <div
        ref={scrollRef}
        className="cad-segmented-scroll"
        style={{ display: "flex", gap: 10, overflowX: "auto", scrollBehavior: "smooth", padding: "2px" }}
      >
        {bancos.map((b) => {
          const activo = b.id === bancoId;
          const disponible = brutoUSD(st, b);
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
                padding: "8px 14px 8px 10px", borderRadius: 12, cursor: "pointer",
                border: `1.5px solid ${activo ? C.verde : C.line}`,
                background: activo ? C.greenSoft : C.surface,
                minWidth: 190, textAlign: "left", fontFamily: FONTS.SANS
              }}
            >
              <AvatarBanco nombre={b.nombre} tamano={30} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>
                  {b.nombre}
                </div>
                <div style={{ fontSize: 11, color: C.mut, fontVariantNumeric: "tabular-nums" }}>
                  {money(disponible, "USD")} · {b.moneda}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={() => desplazar(1)} aria-label="Siguiente" style={flechaBancoEstilo}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

const flechaBancoEstilo = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: `1px solid ${C.line}`,
  background: C.surface,
  color: C.mut,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0
};
