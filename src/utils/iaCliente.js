import { supabase } from "../supabase.js";

/**
 * Llama a la Edge Function ai-asistente. Cada función de IA del sistema
 * (preguntas, categorizar, resumen) usa este mismo cliente con un "modo"
 * distinto — ver supabase/functions/ai-asistente/index.ts.
 */
async function llamarIA(modo, datos) {
  try {
    const { data, error } = await supabase.functions.invoke("ai-asistente", { body: { modo, ...datos } });
    if (error) throw error;
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
