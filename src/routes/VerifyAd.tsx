import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/verify")({
  component: VerifyComponent,
});

// ඔයාගේ Site එකේ තියෙන Adsterra Direct Link එක
const AD_URL = "https://acorntar.com/dk4nenmww6?key=f4402d71c88bddbb0bd00cf797e858e9";

// අපි පස්සේ හදන Bot Cloudflare Worker එකේ URL එක
const WORKER_URL = "https://your-bot-name.workers.dev";

function VerifyComponent() {
  useEffect(() => {
    // 1. URL එකෙන් Telegram Chat/User ID එක ගන්නවා (?a=6857599209)
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("a");

    const redirectToAd = () => {
      window.location.replace(AD_URL);
    };

    if (userId) {
      // 2. Worker එකට User verify උනා කියලා Signal එක යවනවා
      fetch(`${WORKER_URL}/verify?a=${userId}`, { keepalive: true })
        .catch((err) => console.error("Verify Signal Error:", err))
        .finally(() => {
          // 3. තත්පරයකින් කෙලින්ම Adsterra Ad එකට Redirect වෙනවා
          setTimeout(redirectToAd, 800);
        });
    } else {
      redirectToAd();
    }
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
        Redirecting to Sponsor Ad...
      </h3>
      <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "6px" }}>
        Please wait, you will be redirected automatically.
      </p>
    </div>
  );
}
