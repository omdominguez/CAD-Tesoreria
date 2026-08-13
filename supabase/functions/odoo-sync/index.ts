// =====================================================================
//  Edge Function: odoo-sync
//  ---------------------------------------------------------------------
//  Lee de Odoo los pedidos de compra y facturas de venta recientes, junto
//  con el RIF de cada contacto involucrado (para poder emparejarlos con
//  los proveedores/clientes de CAD-Tesorería). Sigue siendo de SOLO
//  LECTURA — la escritura real en CAD-Tesorería ocurre del lado del
//  cliente (actions/actionsOdoo.js), después de que el usuario revisa la
//  vista previa y confirma.
//
//  Modelos de Odoo consultados:
//    - purchase.order   → pedidos de compra
//    - account.move     → facturas, filtradas a move_type = 'out_invoice'
//    - res.partner      → RIF (campo "vat") de cada contacto involucrado
//
//  Secrets: ODOO_URL, ODOO_DB, ODOO_LOGIN, ODOO_API_KEY.
//  Parámetro opcional en la URL: ?dias=30 (por defecto 30).
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

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get("ODOO_URL");
    const db = Deno.env.get("ODOO_DB");
    const login = Deno.env.get("ODOO_LOGIN");
    const apiKey = Deno.env.get("ODOO_API_KEY");

    if (!url || !db || !login || !apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Faltan variables ODOO_URL / ODOO_DB / ODOO_LOGIN / ODOO_API_KEY en Supabase → Edge Functions → Secrets." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const params = new URL(req.url).searchParams;
    const dias = Number(params.get("dias") || "30");
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const uid = await llamarOdoo(url, "common", "authenticate", [db, login, apiKey, {}]);
    if (!uid) {
      return new Response(JSON.stringify({ ok: false, error: "Usuario/API Key inválidos." }), { status: 401, headers: { "Content-Type": "application/json" } });
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

    // --- Contactos: se busca el RIF (campo "vat" en Odoo) de cada partner_id
    // que aparece en los pedidos/facturas, para poder emparejar cada uno con
    // el proveedor/cliente correcto en CAD-Tesorería (que usa el RIF como
    // llave, no el nombre — los nombres pueden venir escritos distinto).
    const idsPartner = [...new Set([...pedidos, ...facturas].map((r) => r.partner_id?.[0]).filter(Boolean))];
    let contactos: unknown[] = [];
    if (idsPartner.length > 0) {
      contactos = await execute("res.partner", "read", [idsPartner], { fields: ["name", "vat"] });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        rangoDesde: desde,
        pedidosCompra: { total: pedidos.length, muestra: pedidos },
        facturasVenta: { total: facturas.length, muestra: facturas },
        contactos
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
