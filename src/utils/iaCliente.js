import { supabase } from "../supabase.js";

/**
 * Llama a la Edge Function ai-asistente. Cada función de IA del sistema
 * (preguntas, categorizar, resumen) usa este mismo cliente con un "modo"
 * distinto — ver supabase/functions/ai-asistente/index.ts.
 */
async function llamarIA(modo, datos) {
  try {
    const { data, error } = await supabase.functions.invoke("ai-asistente", { body: { modo, ...datos } });

    if (error) {
      // Cuando la función responde con un error HTTP (ej. 500), el cliente
      // de Supabase lanza un mensaje genérico ("Edge Function returned a
      // non-2xx status code") ANTES de leer el detalle real que la función
      // sí manda en el cuerpo de la respuesta — hay que ir a buscarlo a
      // error.context (la respuesta cruda), si está disponible.
      let detalle = error.message;
      try {
        const cuerpo = await error.context?.json?.();
        if (cuerpo?.error) detalle = cuerpo.error;
      } catch {
        // el cuerpo no era JSON legible — nos quedamos con el mensaje genérico
      }
      throw new Error(detalle);
    }

    if (!data.ok) throw new Error(data.error || "Error desconocido de la IA");
    return data;
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

/** Pregunta en lenguaje natural sobre las finanzas, con el resumen de datos como contexto. */
export const preguntarIA = (pregunta, resumen) => llamarIA("pregunta", { pregunta, resumen });

/** Sugiere una categoría de gasto a partir de la descripción del pedido. */
export const categorizarConIA = (descripcion, categorias) => llamarIA("categorizar", { descripcion, categorias });

/** Genera un resumen ejecutivo en prosa a partir de los datos ya calculados de un reporte. */
export const resumirConIA = (datosReporte, titulo) => llamarIA("resumen", { datosReporte, titulo });
