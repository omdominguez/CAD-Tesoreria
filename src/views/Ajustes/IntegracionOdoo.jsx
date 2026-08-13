import React, { useState } from "react";
import { Plug, CheckCircle2, XCircle, Loader2, Download, ExternalLink } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { supabase } from "../../supabase.js";

import { Section, Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";
import ImportarOdooManual from "./ImportarOdooManual";

/**
 * Panel de integración con Odoo. CAD-Tesorería no busca reemplazar Odoo —
 * Odoo sigue siendo la fuente de verdad de qué se compró/vendió y por
 * cuánto; esta herramienta solo lee esa información y la vuelve más
 * amigable para gestionar bancos, prioridad de pago, plan de pagos,
 * seguimiento de entrega y conciliación.
 *
 * Arriba: importación manual (probar el flujo ya, sin esperar la API).
 * Abajo: los 3 pasos por API (probar conexión, vista previa, importar).
 */
export default function IntegracionOdoo({ st, act }) {
  const [probando, setProbando] = useState(false);
  const [resultadoTest, setResultadoTest] = useState(null);

  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errorPreview, setErrorPreview] = useState(null);

  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState(null);

  const probarConexion = async () => {
    setProbando(true);
    setResultadoTest(null);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-test");
      if (error) throw error;
      setResultadoTest(data);
    } catch (e) {
      setResultadoTest({ ok: false, error: e.message || String(e) });
    }
    setProbando(false);
  };

  const cargarPreview = async () => {
    setCargandoPreview(true);
    setErrorPreview(null);
    setPreview(null);
    setResultadoImport(null);
    try {
      const { data, error } = await supabase.functions.invoke("odoo-sync", { body: { dias: 30 } });
      if (error) throw error;
      if (!data.ok) throw new Error(data.error || "Error desconocido");
      setPreview(data);
    } catch (e) {
      setErrorPreview(e.message || String(e));
    }
    setCargandoPreview(false);
  };

  const importarAhora = () => {
    if (!preview) return;
    setImportando(true);
    const contactos = preview.contactos || [];
    const rPedidos = act.importarPedidosOdoo(preview.pedidosCompra.muestra, contactos);
    const rFacturas = act.importarFacturasOdoo(preview.facturasVenta.muestra, contactos);
    setResultadoImport({ rPedidos, rFacturas });
    setImportando(false);
  };

  return (
    <Section
      title="Integración con Odoo"
      desc="CAD-Tesorería no reemplaza a Odoo — lo visualiza y lo hace más fácil de gestionar (bancos, prioridad de pago, plan de pagos, entregas, conciliación). Odoo sigue siendo la fuente de verdad de qué se compró o vendió."
    >
      <div style={{ marginBottom: 16 }}>
        <ImportarOdooManual st={st} act={act} />
      </div>

      <div style={{ fontSize: 11.5, color: C.mut, margin: "4px 0 20px", textAlign: "center" }}>
        — Lo de abajo es para cuando la API esté habilitada (sincronización automática) —
      </div>

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
          Paso 1 · Probar conexión
        </div>
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          Confirma que la URL, base de datos, usuario y API Key de Odoo están bien configurados como secrets
          en Supabase (ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY).
        </div>
        <Btn onClick={probarConexion} disabled={probando}>
          {probando ? <Loader2 size={14} className="cad-spin" /> : <Plug size={14} />} Probar conexión
        </Btn>

        {resultadoTest && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: resultadoTest.ok ? C.greenSoft : C.rojoSoft, display: "flex", gap: 10 }}>
            {resultadoTest.ok ? <CheckCircle2 size={18} color={C.verde} /> : <XCircle size={18} color={C.rojo} />}
            <div style={{ fontSize: 12.5, color: C.ink }}>
              {resultadoTest.ok ? <>Conexión exitosa. Odoo {resultadoTest.version} respondió (uid {resultadoTest.uid}).</> : <>{resultadoTest.error}</>}
            </div>
          </div>
        )}
      </Card>

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
          Paso 2 · Vista previa de datos (últimos 30 días)
        </div>
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          Trae los pedidos de compra y facturas de venta recientes de Odoo, y el RIF de cada contacto — todavía
          sin crear ni modificar nada en CAD-Tesorería.
        </div>
        <Btn onClick={cargarPreview} disabled={cargandoPreview}>
          {cargandoPreview ? <Loader2 size={14} className="cad-spin" /> : <ExternalLink size={14} />} Ver vista previa
        </Btn>

        {errorPreview && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.rojoSoft, display: "flex", gap: 10 }}>
            <XCircle size={18} color={C.rojo} />
            <div style={{ fontSize: 12.5, color: C.ink }}>{errorPreview}</div>
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: C.mut, marginBottom: 8 }}>
              <span>Desde {preview.rangoDesde}</span>
              <span><b style={{ color: C.ink }}>{preview.pedidosCompra.total}</b> pedido(s) de compra</span>
              <span><b style={{ color: C.ink }}>{preview.facturasVenta.total}</b> factura(s) de venta</span>
              <span><b style={{ color: C.ink }}>{(preview.contactos || []).length}</b> contacto(s) involucrados</span>
            </div>
            <pre style={{ background: C.body, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.5, maxHeight: 260, overflow: "auto", border: `1px solid ${C.line}` }}>
{JSON.stringify({ pedidosCompra: preview.pedidosCompra.muestra.slice(0, 3), facturasVenta: preview.facturasVenta.muestra.slice(0, 3) }, null, 2)}
            </pre>
          </div>
        )}
      </Card>

      {preview && (preview.pedidosCompra.total > 0 || preview.facturasVenta.total > 0) && (
        <Card style={{ padding: 18, borderLeft: `3px solid ${C.verde}` }}>
          <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
            Paso 3 · Importar a CAD-Tesorería
          </div>
          <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12, lineHeight: 1.5 }}>
            Crea los compromisos de pago y cuentas por cobrar correspondientes, emparejando cada uno con el
            proveedor/cliente por RIF (si no existe, se crea automáticamente). Lo que ya se importó antes NO
            se duplica.
          </div>
          <Btn onClick={importarAhora} disabled={importando}>
            {importando ? <Loader2 size={14} className="cad-spin" /> : <Download size={14} />} Importar {preview.pedidosCompra.total + preview.facturasVenta.total} registro(s)
          </Btn>

          {resultadoImport && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.greenSoft, display: "flex", gap: 10 }}>
              <CheckCircle2 size={18} color={C.verde} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.6 }}>
                <b>Pedidos de compra:</b> {resultadoImport.rPedidos.creados} nuevo(s), {resultadoImport.rPedidos.omitidos} ya existían.<br />
                <b>Facturas de venta:</b> {resultadoImport.rFacturas.creados} nueva(s), {resultadoImport.rFacturas.omitidos} ya existían.
              </div>
            </div>
          )}
        </Card>
      )}

      <div style={{ fontSize: 11, color: C.mut2, marginTop: 16, lineHeight: 1.5 }}>
        Por ahora la sincronización es manual — tú decides cuándo. Odoo sigue siendo la fuente de verdad; si
        algo está mal, la corrección real es en Odoo y luego se vuelve a importar. Lo que sí es propio de
        CAD-Tesorería —banco asignado, prioridad, plan de pagos, seguimiento de entrega, conciliación,
        planificación financiera— se gestiona aquí sin afectar a Odoo.
      </div>
    </Section>
  );
}
