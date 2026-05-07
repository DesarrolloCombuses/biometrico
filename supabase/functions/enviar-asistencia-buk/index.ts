import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type RequestBody = {
  asistencia_id?: string;
  obra_id?: number | string;
  dni_colaborador?: string;
  jornada?: string;
  fecha?: string;
  hora?: string;
  sentido?: "entrada" | "salida";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ctrlitToken = Deno.env.get("CTRLIT_API_TOKEN");
  const ctrlitBaseUrl = Deno.env.get("CTRLIT_BASE_URL") ?? "https://app.ctrlit.cl/ctrl/api";
  const pabblyWebhookUrl = Deno.env.get("PABBLY_BUK_ERROR_WEBHOOK_URL");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !ctrlitToken) {
    return jsonResponse({ error: "Faltan variables de entorno de la funcion" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return jsonResponse({ error: "No autenticado" }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: "Sesion invalida" }, 401);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "JSON invalido" }, 400);
  }

  const validationError = validateBody(body);
  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const params = new URLSearchParams({
    obra_id: String(body.obra_id),
    dni_colaborador: String(body.dni_colaborador),
    jornada: formatDateForBuk(String(body.jornada)),
    fecha: formatDateForBuk(String(body.fecha)),
    hora: String(body.hora).slice(0, 5),
    sentido: String(body.sentido)
  });

  const bukUrl = `${ctrlitBaseUrl}/inyectarRegistroAsistencia?${params.toString()}`;
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const response = await fetch(bukUrl, {
      method: "POST",
      headers: {
        token: ctrlitToken,
        Accept: "application/json"
      }
    });

    const respuesta = await readResponse(response);
    const updatePayload = {
      enviado_buk: response.ok,
      buk_status: response.status,
      buk_respuesta: respuesta,
      buk_error: response.ok ? null : extractError(respuesta),
      buk_enviado_at: new Date().toISOString()
    };

    if (body.asistencia_id) {
      await serviceClient
        .from("asistencias")
        .update(updatePayload)
        .eq("id", body.asistencia_id);
    }

    if (!response.ok) {
      await notifyBukError(pabblyWebhookUrl, {
        tipo: "respuesta_error_buk",
        asistencia_id: body.asistencia_id ?? null,
        usuario_supabase: authData.user.email ?? authData.user.id,
        obra_id: body.obra_id,
        dni_colaborador: body.dni_colaborador,
        jornada: body.jornada,
        fecha: body.fecha,
        hora: body.hora,
        sentido: body.sentido,
        status: response.status,
        error: updatePayload.buk_error,
        respuesta,
        enviado_en: updatePayload.buk_enviado_at
      });
    }

    return jsonResponse({
      ok: response.ok,
      status: response.status,
      respuesta
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error enviando asistencia";

    if (body.asistencia_id) {
      await serviceClient
        .from("asistencias")
        .update({
          enviado_buk: false,
          buk_status: null,
          buk_respuesta: null,
          buk_error: message,
          buk_enviado_at: new Date().toISOString()
        })
        .eq("id", body.asistencia_id);
    }

    await notifyBukError(pabblyWebhookUrl, {
      tipo: "conexion_error_buk",
      asistencia_id: body.asistencia_id ?? null,
      usuario_supabase: authData.user.email ?? authData.user.id,
      obra_id: body.obra_id,
      dni_colaborador: body.dni_colaborador,
      jornada: body.jornada,
      fecha: body.fecha,
      hora: body.hora,
      sentido: body.sentido,
      status: null,
      error: message,
      respuesta: null,
      enviado_en: new Date().toISOString()
    });

    return jsonResponse({ error: message }, 500);
  }
});

function validateBody(body: RequestBody) {
  if (!body.obra_id) return "Falta obra_id";
  if (!body.dni_colaborador) return "Falta dni_colaborador";
  if (!body.jornada) return "Falta jornada";
  if (!body.fecha) return "Falta fecha";
  if (!body.hora) return "Falta hora";
  if (!["entrada", "salida"].includes(String(body.sentido))) return "Sentido invalido";
  return "";
}

function formatDateForBuk(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${Number(match[3])}-${match[2]}-${match[1]}`;
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  return { text: await response.text() };
}

function extractError(value: unknown) {
  if (!value || typeof value !== "object") {
    return "Buk/Ctrlit rechazo la solicitud";
  }

  const record = value as Record<string, unknown>;
  return String(record.message ?? record.error ?? record.detail ?? "Buk/Ctrlit rechazo la solicitud");
}

async function notifyBukError(webhookUrl: string | undefined, payload: Record<string, unknown>) {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error("No se pudo notificar error Buk al webhook", {
        status: response.status,
        body: await response.text()
      });
    }
  } catch (error) {
    console.error("Error notificando webhook Buk", error);
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
