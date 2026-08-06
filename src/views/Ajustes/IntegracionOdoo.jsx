import React, { useState } from "react";
import { Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { C, FONTS } from "../../constants/theme";
import { supabase } from "../../supabase.js";

import { Section, Card } from "../../components/ui/Layout";
import { Btn } from "../../components/ui/Buttons";

/**
 * Panel para probar la integración con Odoo, paso a paso:
 * 1) "Probar conexión" llama a la Edge Function odoo-test — solo confirma
 *    que la URL, base de datos, usuario y API Key son correctos.
 * 2) "Ver vista previa" llama a odoo-sync — trae los pedidos de compra y
 *    facturas de venta recientes de Odoo, EN CRUDO, sin escribir nada
 *    todavía en CAD-Tesorería. Es para revisar juntos que los campos
 *    (número, monto, fecha, contacto) calzan antes de conectar la
 *    escritura automática.
 *
 * Requiere que existan las Edge Functions "odoo-test" y "odoo-sync" ya
 * desplegadas en Supabase, con los secrets ODOO_URL / ODOO_DB / ODOO_LOGIN
 * / ODOO_API_KEY configurados (Supabase → Edge Functions → Secrets).
 */
export default function IntegracionOdoo() {
  const [probando, setProbando] = useState(false);
  const [resultadoTest, setResultadoTest] = useState(null);

  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errorPreview, setErrorPreview] = useState(null);

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

  return (
    <Section
      title="Integración con Odoo"
      desc="Conecta CAD-Tesorería con tu Odoo para traer pedidos de compra y facturas de venta automáticamente. Primero se prueba la conexión, luego se revisa una vista previa — todavía no se escribe nada en el sistema."
    >
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
          Paso 1 · Probar conexión
        </div>
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          Confirma que la URL, la base de datos, el usuario y la API Key de Odoo están bien configurados
          como secrets en Supabase (ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY).
        </div>
        <Btn onClick={probarConexion} disabled={probando}>
          {probando ? <Loader2 size={14} className="cad-spin" /> : <Plug size={14} />} Probar conexión
        </Btn>

        {resultadoTest && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: resultadoTest.ok ? C.greenSoft : C.rojoSoft, display: "flex", gap: 10 }}>
            {resultadoTest.ok ? <CheckCircle2 size={18} color={C.verde} /> : <XCircle size={18} color={C.rojo} />}
            <div style={{ fontSize: 12.5, color: C.ink }}>
              {resultadoTest.ok ? (
                <>Conexión exitosa. Odoo {resultadoTest.version} respondió (uid {resultadoTest.uid}).</>
              ) : (
                <>{resultadoTest.error}</>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card style={{ padding: 18 }}>
        <div style={{ fontFamily: FONTS.SANS, fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
          Paso 2 · Vista previa de datos (últimos 30 días)
        </div>
        <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 12 }}>
          Trae los pedidos de compra y facturas de venta recientes de Odoo tal cual, sin crear ni modificar
          nada en CAD-Tesorería todavía. Sirve para confirmar que los campos calzan antes de conectar la
          escritura automática.
        </div>
        <Btn onClick={cargarPreview} disabled={cargandoPreview}>
          {cargandoPreview ? <Loader2 size={14} className="cad-spin" /> : <Plug size={14} />} Ver vista previa
        </Btn>

        {errorPreview && (
          <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: C.rojoSoft, display: "flex", gap: 10 }}>
            <XCircle size={18} color={C.rojo} />
            <div style={{ fontSize: 12.5, color: C.ink }}>{errorPreview}</div>
          </div>
        )}

        {preview && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12.5, color: C.mut, marginBottom: 8 }}>
              Desde {preview.rangoDesde} · {preview.pedidosCompra.total} pedido(s) de compra · {preview.facturasVenta.total} factura(s) de venta
            </div>
            <pre style={{
              background: C.body, borderRadius: 10, padding: 14, fontSize: 11, lineHeight: 1.5,
              maxHeight: 360, overflow: "auto", border: `1px solid ${C.line}`
            }}>
{JSON.stringify({ pedidosCompra: preview.pedidosCompra.muestra.slice(0, 5), facturasVenta: preview.facturasVenta.muestra.slice(0, 5) }, null, 2)}
            </pre>
            <div style={{ fontSize: 11, color: C.mut2, marginTop: 6 }}>
              Mostrando hasta 5 de cada uno para revisar el formato. Comparte esto y armamos la
              importación real (crear compromisos y cuentas por cobrar automáticamente, sin duplicar).
            </div>
          </div>
        )}
      </Card>
    </Section>
  );
}
