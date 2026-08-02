import { useEffect, useRef, useState } from "react";

interface AdBannerProps {
  keyId?: string;
  width?: number;
  height?: number;
  type?: "300x250" | "160x300";
  delay?: number; // Animation එක ඉවර වෙනකම් පොඩි Delay එකක් තැබීමට
}

export default function AdBanner({
  keyId,
  width,
  height,
  type = "300x250",
  delay = 300, // Popup එක Lag නොවී Instant Open වෙන්න 300ms Delay එකක්
}: AdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Ad configurations
  const adConfig = {
    "300x250": {
      key: "9dd5c8b0fb237459ed96d9d5952c404d",
      width: 300,
      height: 250,
    },
    "160x300": {
      key: "399fab0da57ef47c78efa4bbf8625b8b",
      width: 160,
      height: 300,
    },
  };

  const selectedKey = keyId || adConfig[type]?.key || adConfig["300x250"].key;
  const selectedWidth = width || adConfig[type]?.width || 300;
  const selectedHeight = height || adConfig[type]?.height || 250;

  // 1. Popup එකේ Animation එක ඉවර වෙනකම් පොඩ්ඩක් ඉවසීම (Lag එක නැති කිරීමට)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  // 2. Ready වූ පසු Ad එක Load කිරීම
  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    containerRef.current.innerHTML = "";

    const iframe = document.createElement("iframe");
    iframe.width = `${selectedWidth}`;
    iframe.height = `${selectedHeight}`;
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.scrolling = "no";

    containerRef.current.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              background: transparent; 
            }
          </style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key': '${selectedKey}',
              'format': 'iframe',
              'height': ${selectedHeight},
              'width': ${selectedWidth},
              'params': {}
            };
          </script>
          <script type="text/javascript" src="https://acorntar.com/${selectedKey}/invoke.js"></script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, [isReady, selectedKey, selectedWidth, selectedHeight]);

  return (
    <div className="flex justify-center my-4 w-full">
      <div
        ref={containerRef}
        style={{ width: `${selectedWidth}px`, height: `${selectedHeight}px` }}
        className="overflow-hidden bg-muted/10 rounded-lg flex items-center justify-center min-h-[250px]"
      >
        {!isReady && (
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
