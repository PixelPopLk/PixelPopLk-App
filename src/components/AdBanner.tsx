import { useEffect, useRef } from "react";

export default function AdBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !bannerRef.current) return;
    if (bannerRef.current.hasChildNodes()) return;

    (window as any).atOptions = {
      key: "9dd5c8b0fb237459ed96d9d5952c404d",
      format: "iframe",
      height: 250,
      width: 300,
      params: {},
    };

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "//acorntar.com/9dd5c8b0fb237459ed96d9d5952c404d/invoke.js";

    bannerRef.current.appendChild(script);

    return () => {
      if (bannerRef.current) {
        bannerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className="flex justify-center my-4 w-full">
      <div 
        ref={bannerRef} 
        style={{ width: "300px", height: "250px" }} 
        className="overflow-hidden bg-muted/10 rounded-lg flex items-center justify-center"
      />
    </div>
  );
}
