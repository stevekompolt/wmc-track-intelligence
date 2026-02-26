import { useEffect, useRef } from "react";

export default function Utah2026() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Auto-play voiceover when the page loads (iframe starts)
    const timer = setTimeout(() => {
      audioRef.current?.play().catch(() => {
        // Browser may block autoplay; silent fallback
      });
    }, 1500); // slight delay to let the Cesium story begin loading

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full w-full relative">
      <audio ref={audioRef} src="/audio/utah2026-voiceover.mp3" preload="auto" />
      <iframe
        title="WMC Utah 2026"
        width="100%"
        height="100%"
        src="https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1"
        frameBorder="0"
        allow="fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    </div>
  );
}
