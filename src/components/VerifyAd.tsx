import React, { useEffect } from 'react';

// 👇 1. ඔයාගේ Adsterra Smart Link / Direct Link එක මෙතනට දාන්න
const ADSTERRA_SMART_LINK = "https://acorntar.com/dk4nenmww6?key=f4402d71c88bddbb0bd00cf797e858e9";

// 👇 2. Cloudflare Worker එකේ URL එක
const WORKER_URL = "https://your-bot-name.workers.dev";

const VerifyAd: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('a');

    // User ID එකක් නැත්නම් කෙලින්ම Ad එකට redirect කරනවා
    if (!userId) {
      window.location.replace(ADSTERRA_SMART_LINK);
      return;
    }

    // 1. Worker එකට User verify උනා කියලා Signal එක යවනවා
    fetch(`${WORKER_URL}/verify?a=${userId}`, { keepalive: true })
      .catch((err) => console.error("Verify error:", err))
      .finally(() => {
        // 2. Request එක ගිය ගමන් කෙලින්ම Adsterra Ad Link එකට Redirect වෙනවා
        // (තත්පර 1ක පොඩි delay එකක් තියෙන්නේ Network request එක හරියටම වැදෙන්න)
        setTimeout(() => {
          window.location.replace(ADSTERRA_SMART_LINK);
        }, 800);
      });
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '90vh',
      backgroundColor: '#0f172a',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      {/* Loading Spinner එකක් */}
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #1e293b',
        borderTop: '5px solid #38bdf8',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h3 style={{ marginTop: '20px', fontWeight: '500' }}>Redirecting to Sponsor Ad...</h3>
      <p style={{ color: '#64748b', fontSize: '14px' }}>Please wait, you will be redirected automatically.</p>
    </div>
  );
};

export default VerifyAd;
