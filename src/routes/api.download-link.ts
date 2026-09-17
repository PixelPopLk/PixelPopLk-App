import { createFileRoute } from "@tanstack/react-router";

const SUPABASE_URL = "https://gilnzvsnkwrnfbwhobow.supabase.co";
const MAX_ID = 2_147_483_647;

type DownloadRequest = {
  subtitleId?: unknown;
  variant?: unknown;
};

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    request.headers.get("cf-connecting-ip") ??
    forwarded?.split(",")[0]?.trim() ??
    "unknown";

  // The database only needs a stable, bounded key for rate limiting; it does
  // not need a user agent or any personally identifying profile data.
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
          return jsonResponse(
            { error: "Download service is not configured." },
            503,
          );
        }

        let body: DownloadRequest;
        try {
          body = (await request.json()) as DownloadRequest;
        } catch {
          return jsonResponse({ error: "Invalid request." }, 400);
        }

        const subtitleId = Number(body.subtitleId);
        const variant = body.variant === "telegram" ? "telegram" : "direct";
        if (
          !Number.isInteger(subtitleId) ||
          subtitleId < 1 ||
          subtitleId > MAX_ID
        ) {
          return jsonResponse({ error: "Invalid subtitle." }, 400);
        }

        try {
          const response = await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/claim_download_link`,
            {
              method: "POST",
              headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                p_target_id: subtitleId,
                p_variant: variant,
                p_client_key: getClientKey(request),
              }),
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes("download request limit reached")) {
              return jsonResponse(
                { error: "Too many download requests. Try again shortly." },
                429,
              );
            }
            console.error(
              "claim_download_link failed",
              response.status,
              errorText,
            );
            return jsonResponse(
              { error: "Download link is unavailable." },
              503,
            );
          }

          const data = (await response.json()) as Array<{ link?: unknown }>;
          const link = data[0]?.link;
          if (typeof link !== "string" || !link.trim()) {
            return jsonResponse({ error: "Download link was not found." }, 404);
          }

          return jsonResponse({ link: link.trim() }, 200);
        } catch (error) {
          console.error("download-link server error", error);
          return jsonResponse(
            { error: "Download service is temporarily unavailable." },
            503,
          );
        }
      },
    },
  },
});
