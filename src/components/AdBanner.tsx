import { useEffect, useRef } from "react";

// width සහ height එක prop එකක් විදිහට ගන්නවා
interface AdBannerProps {
  zoneKey: string;
  width: number;
  height: number;
}

export default function AdBanner({ zoneKey, width, height }: AdBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !bannerRef.current) return;
    if (bannerRef.current.hasChildNodes()) return;

    // options වලට අදාළ width සහ height එකතු කරනවා
    (window as any).atOptions = {
      key: zoneKey,
      format: "iframe",
      height: height,
      width: width,
      params: {},
    };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `//acorntar.com/${zoneKey}/invoke.js`;

    bannerRef.current.appendChild(script);

    return () => {
      if (bannerRef.current) {
        bannerRef.current.innerHTML = "";
      }
    };
  }, [zoneKey, width, height]);

  return (
    <div className="flex justify-center my-4 w-full overflow-hidden">
      <div 
        ref={bannerRef} 
        style={{ width: `${width}px`, height: `${height}px` }} 
        className="overflow-hidden bg-muted/10 rounded-lg flex items-center justify-center max-w-full"
      />
    </div>
  );
}
