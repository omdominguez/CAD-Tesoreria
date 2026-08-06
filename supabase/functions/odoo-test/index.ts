// =====================================================================
//  Edge Function: odoo-test
//  ---------------------------------------------------------------------
//  Prueba la conexión con Odoo ANTES de construir la sincronización real.
//  No lee pedidos ni facturas todavía — solo confirma que la URL, la base
//  de datos, el usuario y la API Key son correctos, y de paso dice qué
//  versión de Odoo respondió.
//
//  Usa el protocolo JSON-RPC de Odoo (HTTP + JSON puro, sin librerías de
//  XML-RPC), llamando primero a "common.version" (público, sirve para
//  confirmar que la URL es alcanzable) y luego a "common.authenticate"
//  (privado, confirma usuario + clave).
//
//  Requiere 4 variables de entorno (secrets) en Supabase:
//    ODOO_URL      -> ej. https://tuempresa.odoo.com  (SIN barra al final)
//    ODOO_DB       -> el nombre de tu base de datos en Odoo
//    ODOO_LOGIN    -> el correo con el que entras a Odoo
//    ODOO_API_KEY  -> la clave generada en Mi perfil → Seguridad de la cuenta
// =====================================================================

async function llamarOdoo(url: string, service: string, method: string, args: unknown[]) {
  const respuesta = await fetch(`${url}/jsonrpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "call",
      params: { service, method, args },
      id: Date.now()
    })
  });

  const json = await respuesta.json();
  if (json.error) {
    // Odoo devuelve errores dentro de un JSON 200 OK, no como HTTP error
    const mensaje = json.error?.data?.message || json.error?.message || "Error desconocido de Odoo";
    throw new Error(mensaje);
  }
  return json.result;
}

Deno.serve(async (_req) => {
  try {
    const url = Deno.env.get("ODOO_URL");
    const db = Deno.env.get("ODOO_DB");
    const login = Deno.env.get("ODOO_LOGIN");
    const apiKey = Deno.env.get("ODOO_API_KEY");

    const faltantes = [
      !url && "ODOO_URL",
      !db && "ODOO_DB",
      !login && "ODOO_LOGIN",
      !apiKey && "ODOO_API_KEY"
    ].filter(Boolean);

    if (faltantes.length > 0) {
      return new Response(
        JSON.stringify({ ok: false, error: `Faltan estas variables en Supabase → Edge Functions → Secrets: ${faltantes.join(", ")}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1) ¿La URL responde y qué versión de Odoo es? (no requiere login)
    const version = await llamarOdoo(url!, "common", "version", []);

    // 2) ¿El usuario y la API Key son válidos para esa base de datos?
    const uid = await llamarOdoo(url!, "common", "authenticate", [db, login, apiKey, {}]);

    if (!uid) {
      return new Response(
        JSON.stringify({ ok: false, error: "Odoo respondió, pero el usuario/API Key no son válidos para esa base de datos. Revisa ODOO_DB, ODOO_LOGIN y ODOO_API_KEY." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mensaje: "Conexión con Odoo exitosa.",
        version: version?.server_version || version,
        uid
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
