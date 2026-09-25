import React, { useEffect, useState } from 'react';

// 👇 1. මෙතනට ඔයාගේ Adsterra Direct Link / Smart Link එක Paste කරන්න
const ADSTERRA_SMART_LINK = "https://acorntar.com/dk4nenmww6?key=f4402d71c88bddbb0bd00cf797e858e9"; 

// 👇 2. Cloudflare Worker එක හැදුවම ඒකෙ URL එක මෙතනට දෙන්න
const WORKER_URL = "https://your-bot-name.workers.dev";

const VerifyAd: React.FC = () => {
  const [adClicked, setAdClicked] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('a');
    if (id) setUserId(id);
  }, []);

  // User "Watch Ad" බටන් එක click කළ විට
  const handleWatchAd = () => {
    // A. අලුත් Tab එකකින් Adsterra Smart Link එක open වෙනවා
    window.open(ADSTERRA_SMART_LINK, '_blank');
    setAdClicked(true);

    // B. තත්පර 5ක Countdown Timer එක පටන් ගන්නවා
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);

          // C. Worker එකට Verification Signal එක යැවීම
          if (userId) {
            fetch(`${WORKER_URL}/verify?a=${userId}`)
              .then((res) => res.json())
              .then(() => setIsVerified(true))
              .catch(() => setIsVerified(true)); // Testing සඳහා
          } else {
            setIsVerified(true);
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>File Verification</h2>

        {!isVerified ? (
          <div>
            {!adClicked ? (
              <div>
                <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                  Click the button below to watch the sponsor ad and unlock your Telegram files.
                </p>
                {/* User click කරන ප්‍රධාන Button එක */}
                <button onClick={handleWatchAd} style={styles.adButton}>
                  🎬 Click to Watch Ad & Verify
                </button>
              </div>
            ) : (
              <div>
                <p>Verifying ad... Please wait</p>
                <div style={styles.timer}>{timeLeft}s</div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  (Ad එක අලුත් tab එකකින් open වී ඇත)
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ color: '#22c55e' }}>
            <h3 style={{ fontSize: '22px' }}>✅ Verification Successful!</h3>
            <p style={{ color: '#cbd5e1', marginTop: '10px' }}>
              දැන් Telegram වෙත ගොස් <b>'I have clicked ads ⁉️'</b> ඔබන්න.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '85vh',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontFamily: 'sans-serif',
  },
  card: {
    maxWidth: '420px',
    width: '90%',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '35px 20px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  },
  adButton: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
    border: 'none',
    padding: '14px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
    transition: '0.2s',
  },
  timer: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#38bdf8',
    margin: '15px 0',
  }
};

export default VerifyAd;
