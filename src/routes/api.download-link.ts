import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL = "https://gilnzvsnkwrnfbwhobow.supabase.co";
const MAX_ID = 2_147_483_647;

type DownloadRequest = {
  action?: unknown;
  subtitleId?: unknown;
  variant?: unknown;
  sessionToken?: unknown;
};

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
        const headers = {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        };

        try {
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
              console.error("Could not create download ad session", sessionResponse.status, await sessionResponse.text());
              return jsonResponse({ error: "Verification could not be started. Try again." }, 503);
            }

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
              return jsonResponse({ error: "Too many download requests. Try again shortly." }, 429);
            }
            if (errorText.includes("ad session is invalid")) {
              return jsonResponse({ error: "Verification expired or incomplete. Please restart the download step." }, 403);
            }
            console.error("claim_download_link_after_ad_wait failed", response.status, errorText);
            return jsonResponse({ error: "Download link is unavailable." }, 503);
          }

          const data = (await response.json()) as Array<{ link?: unknown }>;
          const link = data[0]?.link;
          if (typeof link !== "string" || !link.trim()) {
            return jsonResponse({ error: "Download link was not found." }, 404);
          }
          return jsonResponse({ link: link.trim() }, 200);
        } catch (error) {
          console.error("download-link server error", error);
          return jsonResponse({ error: "Download service is temporarily unavailable." }, 503);
        }
      },
    },
  },
});
