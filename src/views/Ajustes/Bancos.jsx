import React, { useState } from "react";
import { Plus, Trash2, Pencil, Landmark, ArrowUpRight, ArrowDownLeft, History } from "lucide-react";

// Lógica y Tema
import { C, FONTS } from "../../constants/theme";
import { money, fmtD, construirLedgerBanco, bancosOrdenados } from "../../utils/finance";
import { AvatarBanco } from "../../components/shared/AvatarBanco";

// Componentes UI
import { Section, Card, Empty, Modal } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import { Field, Input, Select } from "../../components/ui/Forms";
import { Th, Td } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Data";

export default function Bancos({ st, act }) {
  const [modalData, setModalData] = useState(null); // null = cerrado, { type: 'new' | 'edit', data: obj }
  const [verMovimientos, setVerMovimientos] = useState(null); // id del banco a ver, o null

  const bancos = bancosOrdenados(st);

  return (
    <Section 
      title="Cuentas Bancarias" 
      desc="Registra tus cuentas. Tesorería las usará para emitir pagos o recibir cobranzas." 
      action={
        <Btn onClick={() => setModalData({ type: "new", data: null })}>
          <Plus size={15} /> Agregar banco
        </Btn>
      }
    >
      {bancos.length === 0 ? (
        <Empty 
          icon={Landmark} 
          title="Sin cuentas registradas" 
          msg="Agrega bancos para proyectar la caja." 
          action={
            <Btn onClick={() => setModalData({ type: "new", data: null })}>
              <Plus size={15} /> Agregar banco
            </Btn>
          } 
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {bancos.map((b) => (
            <Card key={b.id} style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <AvatarBanco nombre={b.nombre} tamano={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{b.nombre}</div>
                  <div style={{ fontSize: 11.5, color: C.mut }}>{b.tipoCuenta} · {b.numeroCuenta || "sin número"}</div>
                </div>
                <Badge tone="mut">{b.moneda}</Badge>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.mut, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 3 }}>
                  Saldo actual
                </div>
                <div style={{ fontFamily: FONTS.SANS, fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: -0.4 }}>
                  {money(b.saldoActual, b.moneda)}
                </div>
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <Btn small variant="ghost" style={{ flex: 1 }} onClick={() => setVerMovimientos(b.id)}>
                  <History size={13} /> Movimientos
                </Btn>
                <Btn small variant="ghost" onClick={() => setModalData({ type: "edit", data: b })}>
                  <Pencil size={13} />
                </Btn>
                <Btn small variant="danger" onClick={() => act.delBanco(b.id)}>
                  <Trash2 size={13} />
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalData && (
        <BancoModal 
          initialData={modalData.data} 
          onClose={() => setModalData(null)}
          onSave={(data) => {
            modalData.type === "edit" ? act.updBanco(data) : act.addBanco(data);
            setModalData(null);
          }}
        />
      )}

      {verMovimientos && (
        <MovimientosBancoModal
          st={st}
          banco={bancos.find((b) => b.id === verMovimientos)}
          onClose={() => setVerMovimientos(null)}
        />
      )}
    </Section>
  );
}

/* ============================================================
   COMPONENTE AISLADO: MOVIMIENTOS DE UNA CUENTA (solo lectura)
   ------------------------------------------------------------
   Misma lógica de ledger que el Libro de Bancos en Tesorería —
   esto es una vista rápida sin salir de Ajustes.
   ============================================================ */
function MovimientosBancoModal({ st, banco, onClose }) {
  const historial = construirLedgerBanco(st, banco?.id);

  return (
    <Modal title={`Movimientos · ${banco?.nombre || ""}`} wide onClose={onClose}>
      {historial.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 10px", color: C.mut, fontSize: 13.5 }}>
          Esta cuenta no registra movimientos todavía.
        </div>
      ) : (
        <div className="cad-table-scroll" style={{ overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Concepto</Th>
                <Th right>Egreso</Th>
                <Th right>Ingreso</Th>
                <Th right>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {historial.map((r) => (
                <tr key={r.id}>
                  <Td>{fmtD(r.fecha)}</Td>
                  <Td>
                    <div style={{ fontWeight: 700, color: C.ink }}>{r.concepto}</div>
                    <div style={{ fontSize: 11.5, color: C.mut }}>{r.detalle}</div>
                  </Td>
                  <Td right>
                    {r.tipo === "DEBITO" ? (
                      <span style={{ color: C.rojo, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <ArrowUpRight size={12} /> {money(r.monto, banco?.moneda)}
                      </span>
                    ) : "—"}
                  </Td>
                  <Td right>
                    {r.tipo === "CREDITO" ? (
                      <span style={{ color: C.verde, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <ArrowDownLeft size={12} /> {money(r.monto, banco?.moneda)}
                      </span>
                    ) : "—"}
                  </Td>
                  <Td right bold style={{ fontVariantNumeric: "tabular-nums" }}>
                    {money(r.saldoProgresivo, banco?.moneda)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <Btn variant="ghost" onClick={onClose}>Cerrar</Btn>
      </div>
    </Modal>
  );
}

/* ============================================================
   COMPONENTE AISLADO: FORMULARIO DE BANCO
   ============================================================ */
function BancoModal({ initialData, onClose, onSave }) {
  const [f, setF] = useState(initialData || { 
    nombre: "", 
    numeroCuenta: "", 
    tipoCuenta: "Corriente", 
    moneda: "BS", 
    saldoInicial: "", 
    saldoActual: "" 
  });

  const guardar = () => {
    if (!f.nombre) return;
    onSave({ 
      ...f, 
      saldoInicial: Number(f.saldoInicial || 0), 
      saldoActual: Number(f.saldoActual || f.saldoInicial || 0) 
    });
  };

  return (
    <Modal title={initialData ? "Editar banco" : "Agregar banco"} onClose={onClose}>
      <Field label="Nombre del banco">
        <Input 
          value={f.nombre} 
          onChange={(e) => setF({ ...f, nombre: e.target.value })} 
          placeholder="Banesco, Mercantil..." 
        />
      </Field>
      
      <Field label="Número de cuenta">
        <Input 
          value={f.numeroCuenta} 
          onChange={(e) => setF({ ...f, numeroCuenta: e.target.value })} 
        />
      </Field>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tipo de cuenta">
          <Select value={f.tipoCuenta} onChange={(e) => setF({ ...f, tipoCuenta: e.target.value })}>
            <option>Corriente</option>
            <option>Ahorro</option>
            <option>Custodia</option>
          </Select>
        </Field>
        
        <Field label="Moneda">
          <Select value={f.moneda} onChange={(e) => setF({ ...f, moneda: e.target.value })}>
            <option value="BS">Bs</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
        </Field>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Saldo inicial">
          <Input 
            type="number" 
            value={f.saldoInicial} 
            disabled={!!initialData}
            onChange={(e) => setF({ ...f, saldoInicial: e.target.value })} 
          />
        </Field>
        
        {initialData ? (
          <Field label="Saldo actual">
            <div style={{ display: "flex", alignItems: "center", height: 38, fontSize: 13.5, fontWeight: 700, color: C.ink }}>
              {money(Number(f.saldoActual) || 0, f.moneda)}
            </div>
          </Field>
        ) : (
          <Field label="Saldo actual">
            <Input 
              type="number" 
              value={f.saldoActual} 
              onChange={(e) => setF({ ...f, saldoActual: e.target.value })} 
            />
          </Field>
        )}
      </div>
      {initialData && (
        <div style={{ fontSize: 11.5, color: C.mut, marginTop: -4, marginBottom: 6, lineHeight: 1.4 }}>
          El saldo actual ya no se edita a mano aquí — lo actualizan automáticamente los pagos y cobranzas
          registrados. Si no coincide con el libro, corrígelo desde Banco → "Recalcular saldo".
        </div>
      )}
      
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={guardar}>Guardar</Btn>
      </div>
    </Modal>
  );
}
