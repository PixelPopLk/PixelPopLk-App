import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/verify")({
  component: VerifyComponent,
});

// ඔයාගේ Site එකේ තියෙන Adsterra Direct Link එක
const AD_URL = "https://acorntar.com/dk4nenmww6?key=f4402d71c88bddbb0bd00cf797e858e9";

// අපි පස්සේ හදන Bot Cloudflare Worker එකේ URL එක
const WORKER_URL = "https://your-bot-name.workers.dev";

function VerifyComponent() {
  const [verificationComplete, setVerificationComplete] = useState(false);

  useEffect(() => {
    // Keep the Telegram verification signal, but never force a third-party redirect.
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("a");

    if (!userId) {
      setVerificationComplete(true);
      return;
    }

    fetch(`${WORKER_URL}/verify?a=${encodeURIComponent(userId)}`, {
      keepalive: true,
    })
      .catch((err) => console.error("Verify Signal Error:", err))
      .finally(() => setVerificationComplete(true));
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#0e0e12",
        color: "#ffffff",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "20px",
      }}
    >
      {/* Loading Spinner එකක් */}
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "4px solid #1e1e24",
          borderTop: "4px solid #38bdf8",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h3 style={{ marginTop: "20px", fontSize: "18px", fontWeight: "600" }}>
        {verificationComplete ? "Verification step complete" : "Completing verification..."}
      </h3>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "6px", maxWidth: "420px" }}>
        {verificationComplete
          ? "Your browser may block sponsor links. If you choose to view the sponsor, open it below; otherwise you can continue using PixelPopLK."
          : "Please wait while we finish the verification step."}
      </p>
      {verificationComplete && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "12px", marginTop: "20px" }}>
          <button
            type="button"
            onClick={() => window.open(AD_URL, "_blank", "noopener,noreferrer")}
            style={{ border: 0, borderRadius: "8px", padding: "12px 18px", background: "#38bdf8", color: "#0e0e12", fontWeight: 700, cursor: "pointer" }}
          >
            Open sponsor link
          </button>
          <a
            href="/"
            style={{ border: "1px solid #475569", borderRadius: "8px", padding: "12px 18px", color: "#ffffff", textDecoration: "none", fontWeight: 600 }}
          >
            Continue to PixelPopLK
          </a>
        </div>
      )}
    </div>
  );
}
