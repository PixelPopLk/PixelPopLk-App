import { createFileRoute } from "@tanstack/react-router";

type AdvertisingRequest = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  message?: unknown;
  placement?: unknown;
  website?: unknown;
};

function jsonResponse(body: { ok?: boolean; error?: string }, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export const Route = createFileRoute("/api/advertising-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!botToken || !chatId) {
          console.error("Telegram advertising request secrets are not configured");
          return jsonResponse({ error: "දැනට ඉල්ලීම් සේවාව සූදානම් නැහැ. පසුව උත්සාහ කරන්න." }, 503);
        }

        if (!request.headers.get("content-type")?.includes("application/json")) {
          return jsonResponse({ error: "Invalid request format." }, 415);
        }

        let body: AdvertisingRequest;
        try {
          body = (await request.json()) as AdvertisingRequest;
        } catch {
          return jsonResponse({ error: "වැරදි ඉල්ලීමක්. නැවත උත්සාහ කරන්න." }, 400);
        }

        // Honeypot field: silently accept bots without forwarding their message.
        if (cleanText(body.website, 200)) return jsonResponse({ ok: true }, 200);

        const name = cleanText(body.name, 80);
        const phone = cleanText(body.phone, 30);
        const email = cleanText(body.email, 120);
        const message = cleanText(body.message, 1500);
        const placement = cleanText(body.placement, 40);
        const allowedPlacements = ["Website", "Telegram Channel", "Website + Telegram"];

        if (!name || !phone || message.length < 5 || !allowedPlacements.includes(placement)) {
          return jsonResponse({ error: "අවශ්‍ය තොරතුරු නිවැරදිව පුරවන්න." }, 400);
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return jsonResponse({ error: "Email ලිපිනය නිවැරදිව ඇතුළත් කරන්න." }, 400);
        }

        const text = [
          "📢 NEW ADVERTISEMENT REQUEST",
          "",
          `👤 Name: ${name}`,
          `📞 Contact: ${phone}`,
          `📧 Email: ${email || "Not provided"}`,
          `📍 Placement: ${placement}`,
          "",
          "📝 Advertisement details:",
          message,
          "",
          `🌐 Source: ${new URL(request.url).origin}`,
        ].join("\n");

        try {
          const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              disable_web_page_preview: true,
            }),
          });

          if (!telegramResponse.ok) {
            console.error("Telegram sendMessage failed", telegramResponse.status, await telegramResponse.text());
            return jsonResponse({ error: "ඉල්ලීම යැවීමට නොහැකි වුණා. කරුණාකර පසුව උත්සාහ කරන්න." }, 502);
          }

          const result = (await telegramResponse.json()) as { ok?: boolean };
          if (!result.ok) {
            console.error("Telegram API did not accept the advertising request");
            return jsonResponse({ error: "ඉල්ලීම යැවීමට නොහැකි වුණා. කරුණාකර පසුව උත්සාහ කරන්න." }, 502);
          }

          return jsonResponse({ ok: true }, 200);
        } catch (error) {
          console.error("Advertising request Telegram delivery error", error);
          return jsonResponse({ error: "සේවාව තාවකාලිකව අක්‍රියයි. පසුව උත්සාහ කරන්න." }, 503);
        }
      },
    },
  },
});
