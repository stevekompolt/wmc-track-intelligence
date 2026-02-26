import { useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Utah2026() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleEnded = () => setIsPlaying(false);

  return (
    <div className="h-full w-full relative">
      <audio
        ref={audioRef}
        src="/audio/utah2026-voiceover.mp3"
        preload="auto"
        onEnded={handleEnded}
      />
      <Button
        onClick={toggleAudio}
        variant="secondary"
        size="icon"
        className="absolute top-4 right-4 z-50 rounded-full shadow-lg opacity-90 hover:opacity-100"
        title={isPlaying ? "Mute voiceover" : "Play voiceover"}
      >
        {isPlaying ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
      </Button>
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
