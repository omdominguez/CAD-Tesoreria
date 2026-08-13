// =====================================================================
//  Edge Function: ai-asistente (versión Gemini)
//  ---------------------------------------------------------------------
//  Un solo endpoint para las 3 funciones de IA del sistema, cada una con
//  su propio "modo". Llama a la API de Google Gemini del lado del
//  servidor — la clave nunca llega al navegador.
//
//  Modos:
//    "pregunta"    -> responde una pregunta en lenguaje natural sobre las
//                     finanzas de la empresa, usando un resumen de datos
//                     reales que manda el cliente.
//    "categorizar" -> sugiere una categoría de gasto a partir de la
//                     descripción de un pedido.
//    "resumen"     -> genera un párrafo ejecutivo a partir de los
//                     números ya calculados de un reporte.
//
//  Requiere el secret GEMINI_API_KEY en Supabase → Edge Functions →
//  Secrets. Opcional: GEMINI_MODEL, para cambiar el modelo sin tocar
//  código si Google retira el que está por defecto (ya pasó una vez).
// =====================================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

// Google va renombrando/retirando modelos con el tiempo (ya nos pasó una
// vez con "gemini-2.0-flash"). Para no depender de editar código cada
// vez, el nombre se puede sobreescribir con el secret opcional
// GEMINI_MODEL en Supabase — si no está configurado, usa este por
// defecto. Lista de modelos vigentes: https://ai.google.dev/gemini-api/docs/models
const MODELO = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

async function llamarGemini(apiKey: string, systemInstruction: string, mensaje: string, maxTokens = 700) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: mensaje }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 }
    })
  });

  const json = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(json?.error?.message || `Error de Gemini (HTTP ${respuesta.status})`);
  }

  const candidato = json.candidates?.[0];
  if (!candidato) {
    const razon = json.promptFeedback?.blockReason;
    throw new Error(razon ? `Gemini bloqueó la respuesta (${razon}).` : "Gemini no devolvió respuesta.");
  }

  const texto = candidato.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";

  // Si Gemini cortó la respuesta por llegar al límite de longitud, se avisa
  // en vez de dejarla incompleta en silencio — así se sabe que hay que
  // subir maxTokens en vez de pensar que es un bug distinto. (Los modelos
  // "flash" más nuevos pueden gastar parte del límite en razonamiento
  // interno antes de escribir la respuesta visible, por eso a veces se
  // corta más temprano de lo que parecería lógico por el largo del texto.)
  if (candidato.finishReason === "MAX_TOKENS") {
    return texto + "\n\n(La respuesta se cortó por longitud — pídele que sea más breve, o avísale al desarrollador para subir el límite.)";
  }

  return texto;
}

const REGLA_TEXTO_PLANO = `IMPORTANTE: respondes en TEXTO PLANO, sin Markdown — nunca uses asteriscos, guiones de lista, encabezados con # ni ningún otro símbolo de formato, porque donde se muestra tu respuesta no se interpreta y se vería el símbolo tal cual. Si necesitas enumerar varias cosas, usa números seguidos de un punto en líneas separadas, en texto normal.`;

const SYSTEM_PREGUNTA = `Eres el asistente financiero de CAD-Tesorería, el sistema de tesorería de Comercializadora Agrícola Domínguez (CAD Venezuela). Respondes en español, de forma breve y directa, usando SOLO los datos que te dan en el resumen — si algo no está en el resumen, dilo claramente en vez de inventar. Los montos son en USD salvo que se indique lo contrario. No dês consejos financieros generales fuera de los datos entregados. ${REGLA_TEXTO_PLANO} MUY IMPORTANTE — SÉ BREVE: si la pregunta implica listar varios elementos (ej. pagos vencidos, proveedores) y hay más de 5, NO los enumeres todos uno por uno — en su lugar da el total (cuántos son y el monto total sumado) y menciona como máximo los 3 más urgentes o de mayor monto. Prioriza siempre terminar la respuesta completa sobre dar el máximo detalle posible.`;

const SYSTEM_CATEGORIZAR = `Clasificas gastos de una empresa agroindustrial venezolana en UNA de estas categorías exactas: Materia Prima, Activo Fijo (CAPEX), Servicios, Insumos, Financiamiento, Otros. Respondes ÚNICAMENTE con el nombre exacto de la categoría, sin explicación, sin comillas, sin punto final.`;

const SYSTEM_RESUMEN = `Eres un analista financiero que escribe resúmenes ejecutivos breves (máximo 120 palabras) en español, para la gerencia de una empresa agroindustrial venezolana (CAD Venezuela). Usa un tono profesional y directo. Basado SOLO en los números que te dan, destaca lo más relevante (tendencias, riesgos, montos grandes) — no inventes datos que no te dieron. ${REGLA_TEXTO_PLANO}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "Falta el secret GEMINI_API_KEY en Supabase → Edge Functions → Secrets." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const { modo, ...datos } = await req.json();

    if (modo === "pregunta") {
      const { pregunta, resumen } = datos;
      if (!pregunta) throw new Error("Falta la pregunta.");
      const mensaje = `Resumen de datos financieros actuales (JSON):\n${JSON.stringify(resumen)}\n\nPregunta del usuario: ${pregunta}`;
      const texto = await llamarGemini(apiKey, SYSTEM_PREGUNTA, mensaje, 1500);
      return new Response(JSON.stringify({ ok: true, texto }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    if (modo === "categorizar") {
      const { descripcion, categorias } = datos;
      if (!descripcion) throw new Error("Falta la descripción.");
      const mensaje = `Categorías válidas: ${(categorias || []).join(", ")}\n\nDescripción del gasto: "${descripcion}"`;
      const texto = await llamarGemini(apiKey, SYSTEM_CATEGORIZAR, mensaje, 20);
      const categoria = texto.trim();
      const valida = (categorias || []).includes(categoria);
      return new Response(
        JSON.stringify({ ok: true, categoria: valida ? categoria : null, crudo: texto }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (modo === "resumen") {
      const { datosReporte, titulo } = datos;
      if (!datosReporte) throw new Error("Faltan los datos del reporte.");
      const mensaje = `Reporte: ${titulo || "Reporte financiero"}\n\nDatos (JSON):\n${JSON.stringify(datosReporte)}`;
      const texto = await llamarGemini(apiKey, SYSTEM_RESUMEN, mensaje, 1500);
      return new Response(JSON.stringify({ ok: true, texto }), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: `Modo desconocido: "${modo}".` }), { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err?.message || err) }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
