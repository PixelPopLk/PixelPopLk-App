import React, { useEffect, useRef } from 'react';

export default function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Component එක mount වෙද්දී script එක එක පාරක් පමණක් load කිරීම
    if (containerRef.current && containerRef.current.children.length === 0) {
      const confScript = document.createElement('script');
      confScript.type = 'text/javascript';
      confScript.text = `
        atOptions = {
          'key' : '9dd5c8b0fb237459ed96d9d5952c404d',
          'format' : 'iframe',
          'height' : 250,
          'width' : 300,
          'params' : {}
        };
      `;

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = 'https://acorntar.com/9dd5c8b0fb237459ed96d9d5952c404d/invoke.js';

      containerRef.current.appendChild(confScript);
      containerRef.current.appendChild(invokeScript);
    }
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
      <div ref={containerRef} style={{ width: '300px', height: '250px' }} />
    </div>
  );
}
