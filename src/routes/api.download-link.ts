import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL = "https://gilnzvsnkwrnfbwhobow.supabase.co";
const MAX_ID = 2_147_483_647;

type DownloadRequest = {
  diagnosticId?: unknown;
  diagnostic?: DiagnosticPayload;
  action?: unknown;
  subtitleId?: unknown;
  variant?: unknown;
  sessionToken?: unknown;
};

type DiagnosticPayload = { diagnosticId?: unknown; event?: unknown; stage?: unknown; outcome?: unknown; subtitleId?: unknown; variant?: unknown; browserFamily?: unknown; browserContext?: unknown; httpStatus?: unknown; errorCode?: unknown; elapsedMs?: unknown; };
const allowed = (value: unknown, values: string[]) => typeof value === 'string' && values.includes(value) ? value : null;
async function writeDiagnostic(serviceRoleKey: string, payload: DiagnosticPayload, defaults: { diagnosticId?: string; subtitleId?: number; variant?: string } = {}) {
  const diagnosticId = typeof payload.diagnosticId === 'string' && /^[0-9a-f-]{36}$/i.test(payload.diagnosticId) ? payload.diagnosticId : defaults.diagnosticId;
  const event = typeof payload.event === 'string' && /^[a-z][a-z0-9_]{1,63}$/.test(payload.event) ? payload.event : null;
  const stage = allowed(payload.stage, ['client','popup','start','return','claim','download']);
  const outcome = allowed(payload.outcome, ['info','success','failure']);
  const variant = allowed(payload.variant ?? defaults.variant, ['direct','telegram']);
  if (!diagnosticId || !event || !stage || !outcome || !variant) return;
  const row = { diagnostic_id: diagnosticId, event, stage, outcome, subtitle_id: Number.isInteger(payload.subtitleId) && Number(payload.subtitleId) > 0 ? Number(payload.subtitleId) : defaults.subtitleId ?? null, variant, browser_family: allowed(payload.browserFamily, ['chrome','samsung','firefox','safari','edge','other']) ?? 'other', browser_context: allowed(payload.browserContext, ['telegram','facebook','instagram','browser','other']) ?? 'browser', http_status: Number.isInteger(payload.httpStatus) && Number(payload.httpStatus) >= 100 && Number(payload.httpStatus) <= 599 ? Number(payload.httpStatus) : null, error_code: typeof payload.errorCode === 'string' && /^[a-z][a-z0-9_]{1,63}$/.test(payload.errorCode) ? payload.errorCode : null, elapsed_ms: Number.isInteger(payload.elapsedMs) && Number(payload.elapsedMs) >= 0 && Number(payload.elapsedMs) <= 600000 ? Number(payload.elapsedMs) : null };
  try { await fetch(SUPABASE_URL + '/rest/v1/download_diagnostics', { method: 'POST', headers: { apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) }); } catch { /* diagnostics must not interrupt downloads */ }
}

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("cf-connecting-ip") ??
    forwarded?.split(",")[0]?.trim() ??
    "unknown";
  return ip.slice(0, 128);
}

function jsonResponse(body: Record<string, string>, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/download-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
          console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");
          return jsonResponse({ error: "Download service is not configured." }, 503);
        }

        let body: DownloadRequest;
        try {
          body = (await request.json()) as DownloadRequest;
        } catch {
          return jsonResponse({ error: "Invalid request." }, 400);
        }

        const subtitleId = Number(body.subtitleId);
        const variant = body.variant === "telegram" ? "telegram" : "direct";
        const action = body.action;
        if (
          !Number.isInteger(subtitleId) ||
          subtitleId < 1 ||
          subtitleId > MAX_ID ||
          (variant !== "direct" && variant !== "telegram")
        ) {
          return jsonResponse({ error: "Invalid subtitle or download type." }, 400);
        }

        const clientKey = getClientKey(request);
        const diagnosticId = typeof body.diagnosticId === 'string' && /^[0-9a-f-]{36}$/i.test(body.diagnosticId) ? body.diagnosticId : undefined;
        const logEvent = (event: string, stage: string, outcome: string, extra: Record<string, unknown> = {}) => writeDiagnostic(serviceRoleKey, { diagnosticId, event, stage, outcome, subtitleId, variant, ...extra });
        const headers = {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        };

        try {
          if (action === "diagnostic") {
            if (body.diagnostic && typeof body.diagnostic === "object") {
              await writeDiagnostic(serviceRoleKey, body.diagnostic as DiagnosticPayload, { diagnosticId, subtitleId, variant });
            }
            return jsonResponse({ ok: "true" }, 200);
          }

          if (action === "start") {
            // A random, short-lived token is created server-side and bound to
            // this client, subtitle, and download variant. The minimum wait is
            // enforced by PostgreSQL, not by the browser's countdown.
            const sessionToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
            const sessionResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/download_ad_sessions`,
              {
                method: "POST",
                headers: { ...headers, Prefer: "return=minimal" },
                body: JSON.stringify({
                  session_token: sessionToken,
                  client_key: clientKey,
                  subtitle_id: subtitleId,
                  variant,
                }),
              },
            );

            if (!sessionResponse.ok) {
              await logEvent("start_failed", "start", "failure", { httpStatus: sessionResponse.status, errorCode: "session_create_failed" });
              console.error("Could not create download ad session", sessionResponse.status, await sessionResponse.text());
              return jsonResponse({ error: "Verification could not be started. Try again." }, 503);
            }

            await logEvent('start_success', 'start', 'success');
            return jsonResponse({ sessionToken }, 200);
          }

          if (action !== "claim" || typeof body.sessionToken !== "string") {
            return jsonResponse({ error: "A valid verification session is required." }, 403);
          }

          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/claim_download_link_after_ad_wait`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                p_target_id: subtitleId,
                p_variant: variant,
                p_client_key: clientKey,
                p_session_token: body.sessionToken,
              }),
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes("download request limit reached")) {
              await logEvent("claim_rate_limited", "claim", "failure", { httpStatus: 429, errorCode: "rate_limited" });
              return jsonResponse({ error: "Too many download requests. Try again shortly." }, 429);
            }
            if (errorText.includes("ad session is invalid")) {
              await logEvent("claim_session_invalid", "claim", "failure", { httpStatus: 403, errorCode: "session_invalid" });
              return jsonResponse({ error: "Verification expired or incomplete. Please restart the download step." }, 403);
            }
            await logEvent("claim_server_error", "claim", "failure", { httpStatus: response.status, errorCode: "claim_failed" });
            console.error("claim_download_link_after_ad_wait failed", response.status, errorText);
            return jsonResponse({ error: "Download link is unavailable." }, 503);
          }

          const data = (await response.json()) as Array<{ link?: unknown }>;
          const link = data[0]?.link;
          if (typeof link !== "string" || !link.trim()) {
            await logEvent("claim_link_missing", "claim", "failure", { httpStatus: 404, errorCode: "link_missing" });
            return jsonResponse({ error: "Download link was not found." }, 404);
          }
          await logEvent("claim_success", "claim", "success", { httpStatus: 200 });
          return jsonResponse({ link: link.trim() }, 200);
        } catch (error) {
          console.error("download-link server error", error);
          return jsonResponse({ error: "Download service is temporarily unavailable." }, 503);
        }
      },
    },
  },
});
