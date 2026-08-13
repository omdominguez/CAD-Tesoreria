// =====================================================================
//  Edge Function: odoo-sync
//  ---------------------------------------------------------------------
//  PASO 2 de la integración con Odoo (después de confirmar con "odoo-test"
//  que la conexión funciona). Esta función SOLO LEE de Odoo y devuelve la
//  lista de pedidos de compra y facturas de venta recientes — todavía NO
//  escribe nada en CAD-Tesorería. Es para revisar juntos que los campos
//  (número, monto, fecha, RIF del contacto) calzan antes de conectar la
//  escritura automática en compromisos / cuentas por cobrar.
//
//  Modelos de Odoo consultados:
//    - purchase.order   → pedidos de compra
//    - account.move     → facturas, filtradas a move_type = 'out_invoice'
//                         (factura de cliente) y state != 'cancel'
//
//  Mismos secrets que odoo-test: ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY.
//
//  Parámetro opcional en la URL: ?dias=30 (por defecto 30) — cuántos días
//  hacia atrás buscar, para no traer el histórico completo cada vez.
// =====================================================================

async function llamarOdoo(url: string, service: string, method: string, args: unknown[]) {
  const respuesta = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() })
  });
  const json = await respuesta.json();
  if (json.error) throw new Error(json.error?.data?.message || json.error?.message || "Error desconocido de Odoo");
  return json.result;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const url = Deno.env.get("ODOO_URL");
    const db = Deno.env.get("ODOO_DB");
    const login = Deno.env.get("ODOO_LOGIN");
    const apiKey = Deno.env.get("ODOO_API_KEY");

    if (!url || !db || !login || !apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Faltan variables ODOO_URL / ODOO_DB / ODOO_LOGIN / ODOO_API_KEY en Supabase → Edge Functions → Secrets." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const params = new URL(req.url).searchParams;
    const dias = Number(params.get("dias") || "30");
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const uid = await llamarOdoo(url, "common", "authenticate", [db, login, apiKey, {}]);
    if (!uid) {
      return new Response(JSON.stringify({ ok: false, error: "Usuario/API Key inválidos." }), { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const execute = (model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) =>
      llamarOdoo(url, "object", "execute_kw", [db, uid, apiKey, model, method, args, kwargs]);

    // --- Pedidos de compra ---
    const pedidos = await execute(
      "purchase.order",
      "search_read",
      [[["date_order", ">=", desde]]],
      { fields: ["name", "partner_id", "amount_total", "amount_untaxed", "amount_tax", "date_order", "state", "currency_id"], limit: 200, order: "date_order desc" }
    );

    // --- Facturas de venta (factura de cliente, no canceladas) ---
    const facturas = await execute(
      "account.move",
      "search_read",
      [[["move_type", "=", "out_invoice"], ["invoice_date", ">=", desde], ["state", "!=", "cancel"]]],
      { fields: ["name", "partner_id", "amount_total", "amount_untaxed", "amount_tax", "invoice_date", "invoice_date_due", "state", "currency_id"], limit: 200, order: "invoice_date desc" }
    );

    return new Response(
      JSON.stringify({
        ok: true,
        rangoDesde: desde,
        pedidosCompra: { total: pedidos.length, muestra: pedidos },
        facturasVenta: { total: facturas.length, muestra: facturas }
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  }
});
