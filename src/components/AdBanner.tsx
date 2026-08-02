import { useEffect, useRef } from "react";

interface AdBannerProps {
  keyId?: string;
  width?: number;
  height?: number;
  type?: "300x250" | "160x300";
}

export default function AdBanner({
  keyId,
  width,
  height,
  type = "300x250",
}: AdBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  // Ad 2 හි විස්තර (300x250 සහ 160x300)
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

  useEffect(() => {
    if (typeof window === "undefined" || !bannerRef.current) return;
    if (bannerRef.current.hasChildNodes()) return;

    (window as any).atOptions = {
      key: selectedKey,
      format: "iframe",
      height: selectedHeight,
      width: selectedWidth,
      params: {},
    };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://acorntar.com/${selectedKey}/invoke.js`;

    bannerRef.current.appendChild(script);

    return () => {
      if (bannerRef.current) {
        bannerRef.current.innerHTML = "";
      }
    };
  }, [selectedKey, selectedWidth, selectedHeight]);

  return (
    <div className="flex justify-center my-4 w-full">
      <div
        ref={bannerRef}
        style={{ width: `${selectedWidth}px`, height: `${selectedHeight}px` }}
        className="overflow-hidden bg-muted/10 rounded-lg flex items-center justify-center"
      />
    </div>
  );
}
