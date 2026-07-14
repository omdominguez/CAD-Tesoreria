import React, { useState, useMemo } from "react";
import { Landmark, ArrowUpRight, ArrowDownLeft, Pencil, History } from "lucide-react";

// Subir 2 niveles para llegar a src/
import { C, FONTS } from "../../constants/theme";
import { money, fmtD, construirLedgerBanco, bancosOrdenados } from "../../utils/finance";
import { usePaged } from "../../hooks/usePaged";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Th, Td, Pagination } from "../../components/ui/Table";
import { Select, Input, Field } from "../../components/ui/Forms";
import { ComboBox } from "../../components/ui/ComboBox";
import { Btn } from "../../components/ui/Buttons";
import { Badge } from "../../components/ui/Data";

export default function LibroBancos({ st, act, rol, usuario }) {
  const bancos = bancosOrdenados(st);
  const esMaster = rol === "MASTER";
  const [editando, setEditando] = useState(null); // id del movimiento en edición, o null

  // Inicializar con el primer banco si existe
  const [bancoId, setBancoId] = useState(bancos[0]?.id || "");

  const bancoSel = bancos.find((b) => b.id === bancoId);

  // Construcción del libro mayor (ledger) del banco seleccionado — lógica
  // compartida con las tarjetas de Ajustes → Bancos (utils/finance.js)
  const historial = useMemo(() => construirLedgerBanco(st, bancoId), [st, bancoId]);

  const pg = usePaged(historial, 15);

  if (bancos.length === 0) {
    return (
      <Empty 
        icon={Landmark} 
        title="Sin cuentas bancarias" 
        msg="Registra una cuenta en el panel de Ajustes para auditar sus movimientos." 
      />
    );
  }

  return (
    <Section 
      title="Libro Auxiliar de Bancos" 
      desc="Audita el flujo de caja real. Revisa cronológicamente cada ingreso y egreso que ha impactado el saldo de tus cuentas."
    >
      {/* Selector de cuenta y resumen rápido */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 240, flex: "0 1 350px" }}>
          <ComboBox
            value={bancoId}
            onChange={setBancoId}
            placeholder="Elegir cuenta..."
            options={bancos.map((b) => ({ value: b.id, label: b.nombre, sublabel: b.moneda }))}
          />
        </div>

        {bancoSel && (
          <div style={{ display: "flex", gap: 24, background: "#fff", padding: "10px 18px", borderRadius: 12, border: `1px solid ${C.line}` }}>
            <div>
              <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>SALDO INICIAL</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{money(bancoSel.saldoInicial, bancoSel.moneda)}</div>
            </div>
            <div style={{ borderLeft: `1px solid ${C.line}` }} />
            <div>
              <div style={{ fontSize: 11, color: C.mut, fontWeight: 700 }}>SALDO ACTUAL EN LIBROS</div>
              <div style={{ fontFamily: FONTS.SERIF, fontSize: 16, fontWeight: 700, color: C.greenDk }}>
                {money(bancoSel.saldoActual, bancoSel.moneda)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabla de movimientos */}
      {historial.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px 20px", color: C.mut, fontSize: 13.5 }}>
          Esta cuenta bancaria no registra movimientos conciliados en el sistema todavía.
        </Card>
      ) : (
        <Card>
          <div className="cad-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Concepto / Detalle</Th>
                  <Th>Referencia</Th>
                  <Th right>Egresos (Cargo)</Th>
                  <Th right>Ingresos (Abono)</Th>
                  <Th right>Saldo en cuenta</Th>
                  {esMaster && <Th right>Acciones</Th>}
                </tr>
              </thead>
              <tbody>
                {pg.slice.map((r) => (
                  <tr key={r.id}>
                    <Td>{fmtD(r.fecha)}</Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, color: C.ink }}>{r.concepto}</div>
                          <div style={{ fontSize: 11.5, color: C.mut }}>{r.detalle}</div>
                        </div>
                        {r.editado && (
                          <span title={`Editado por ${r.editadoPor || "—"} el ${fmtD(r.fechaEdicion)}`}>
                            <Badge tone="amar"><History size={10} /> Editado</Badge>
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td><Badge tone="mut">{r.referencia}</Badge></Td>
                    <Td right>
                      {r.tipo === "DEBITO" ? (
                        <span style={{ color: C.rojo, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ArrowUpRight size={12} /> {money(r.monto, bancoSel?.moneda)}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td right>
                      {r.tipo === "CREDITO" ? (
                        <span style={{ color: C.verde, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ArrowDownLeft size={12} /> {money(r.monto, bancoSel?.moneda)}
                        </span>
                      ) : "—"}
                    </Td>
                    <Td right bold style={{ fontVariantNumeric: "tabular-nums" }}>
                      {money(r.saldoProgresivo, bancoSel?.moneda)}
                    </Td>
                    {esMaster && (
                      <Td right>
                        {r.esMovimiento && (
                          <Btn small variant="ghost" onClick={() => setEditando(r.id)}>
                            <Pencil size={12} /> Corregir
                          </Btn>
                        )}
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pg={pg} />
        </Card>
      )}

      {editando && (
        <EditarMovimientoModal
          st={st}
          movimiento={(st.movimientos || []).find((m) => m.id === editando)}
          onClose={() => setEditando(null)}
          onSave={(cambios) => {
            act.editarMovimiento(editando, cambios, usuario);
            setEditando(null);
          }}
        />
      )}
    </Section>
  );
}

/* ============================================================
   COMPONENTE AISLADO: CORREGIR UN PAGO YA REGISTRADO (SOLO MASTER)
   ------------------------------------------------------------
   No borra el movimiento — permite corregir monto/fecha/banco/
   referencia. La acción editarMovimiento se encarga de reversar
   el efecto viejo en el saldo del banco y aplicar el nuevo, y de
   dejar el rastro de auditoría (quién y cuándo lo corrigió).
   ============================================================ */
function EditarMovimientoModal({ st, movimiento, onClose, onSave }) {
  const [monto, setMonto] = useState(String(movimiento?.monto ?? ""));
  const [fecha, setFecha] = useState(movimiento?.fecha || "");
  const [referencia, setReferencia] = useState(movimiento?.referencia || "");
  const [bancoOrigenId, setBancoOrigenId] = useState(movimiento?.bancoOrigenId || "");

  if (!movimiento) return null;

  const guardar = () => {
    if (!(Number(monto) > 0) || !fecha) return;
    onSave({ monto: Number(monto), fecha, referencia, bancoOrigenId });
  };

  return (
    <Modal title="Corregir pago registrado" onClose={onClose}>
      <div style={{ background: C.amarSoft, color: C.amar, padding: "9px 12px", borderRadius: 10, fontSize: 12, marginBottom: 14 }}>
        Esto no borra el pago — corrige sus datos y ajusta el saldo del banco automáticamente. Quedará marcado como "Editado" con tu nombre y la fecha.
      </div>

      <Field label="Monto">
        <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
      </Field>
      <Field label="Fecha">
        <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </Field>
      <Field label="Banco de origen">
        <ComboBox
          value={bancoOrigenId}
          onChange={setBancoOrigenId}
          placeholder="Elegir banco..."
          options={bancosOrdenados(st).map((b) => ({ value: b.id, label: b.nombre, sublabel: b.moneda }))}
        />
      </Field>
      <Field label="Referencia">
        <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </Field>

      {movimiento.historialEdiciones?.length > 0 && (
        <div style={{ fontSize: 11.5, color: C.mut, marginTop: 4, marginBottom: 10 }}>
          Ya se corrigió {movimiento.historialEdiciones.length} vez/veces antes de esto.
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar}>Guardar corrección</Btn>
      </div>
    </Modal>
  );
}