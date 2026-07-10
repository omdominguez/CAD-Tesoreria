// =====================================================================
//  Edge Function: notificar-nuevo-usuario
//  ---------------------------------------------------------------------
//  Se activa cuando alguien crea una cuenta nueva (INSERT en la tabla
//  profiles) y le manda un correo a Omar avisándole, con un link directo
//  a Ajustes → Equipo para que apruebe y asigne el rol.
//
//  Requiere una variable de entorno (secret) llamada RESEND_API_KEY.
// =====================================================================

const CORREO_AVISO = "omdominguez@cadvenezuela.com";
const URL_APP = "https://cad-tesoreria.netlify.app"; // ajusta si tu dominio es otro

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const nuevoUsuario = payload?.record;

    if (!nuevoUsuario?.email) {
      return new Response(JSON.stringify({ ok: false, error: "Sin registro de usuario en el payload" }), { status: 400 });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: "Falta configurar RESEND_API_KEY" }), { status: 500 });
    }

    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "CAD Tesorería <onboarding@resend.dev>", // cámbialo por tu dominio verificado cuando lo tengas
        to: [CORREO_AVISO],
        subject: `Nuevo usuario por autorizar: ${nuevoUsuario.email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#14532B;">Nueva cuenta registrada</h2>
            <p><b>${nuevoUsuario.email}</b> acaba de crear una cuenta en el sistema de Tesorería de CAD.</p>
            <p>Está pendiente de que le asignes un rol y la autorices para poder entrar.</p>
            <p style="margin-top:24px;">
              <a href="${URL_APP}" style="background:#14532B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;">
                Ir a Ajustes → Equipo
              </a>
            </p>
          </div>
        `
      })
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      return new Response(JSON.stringify({ ok: false, error: detalle }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
});
