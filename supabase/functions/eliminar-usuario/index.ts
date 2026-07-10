// =====================================================================
//  Edge Function: eliminar-usuario
//  ---------------------------------------------------------------------
//  Borra POR COMPLETO la cuenta de un usuario (no solo le quita el
//  acceso): al eliminarse de auth.users, su perfil se borra en cascada,
//  y su correo queda libre para poder registrarse de nuevo más adelante.
//
//  Solo un Master puede ejecutar esto — la función verifica la
//  identidad de quien llama antes de borrar nada.
//
//  A diferencia de "notificar-nuevo-usuario", esta función SÍ requiere
//  verificación de sesión (no lleva --no-verify-jwt al desplegarla),
//  porque necesita saber quién la está llamando.
//
//  Requiere dos variables de entorno (secrets):
//    - SUPABASE_URL              (ya viene configurada automáticamente)
//    - SUPABASE_SERVICE_ROLE_KEY (la clave de administrador — la
//      consigues en Supabase → Project Settings → API → service_role)
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// CORS: sin esto, el navegador bloquea la petición antes de que llegue
// a Supabase (es una regla de seguridad estándar de los navegadores).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  // El navegador manda primero una petición "OPTIONS" de prueba (preflight)
  // antes de la real — hay que responderla igual, o nunca llega la de verdad.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Falta el userId a eliminar" }), { status: 400, headers: CORS_HEADERS });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    // Cliente "normal" (con la sesión de quien llama) para verificar quién es
    const clienteLlamador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: quienLlama }, error: errUser } = await clienteLlamador.auth.getUser();
    if (errUser || !quienLlama) {
      return new Response(JSON.stringify({ ok: false, error: "No se pudo identificar a quien hace la solicitud" }), { status: 401, headers: CORS_HEADERS });
    }

    const { data: perfilLlamador } = await clienteLlamador
      .from("profiles")
      .select("rol")
      .eq("id", quienLlama.id)
      .single();

    if (perfilLlamador?.rol !== "MASTER") {
      return new Response(JSON.stringify({ ok: false, error: "Solo un Master puede eliminar cuentas" }), { status: 403, headers: CORS_HEADERS });
    }

    if (quienLlama.id === userId) {
      return new Response(JSON.stringify({ ok: false, error: "No puedes eliminar tu propia cuenta" }), { status: 400, headers: CORS_HEADERS });
    }

    // Cliente ADMIN (con la clave de servicio) — el único que puede borrar usuarios
    const clienteAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { error: errDelete } = await clienteAdmin.auth.admin.deleteUser(userId);

    if (errDelete) {
      return new Response(JSON.stringify({ ok: false, error: errDelete.message }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: CORS_HEADERS });
  }
});