import { useState, useRef } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Utah2026() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [started, setStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStart = () => {
    setStarted(true);
    setIsPlaying(true);
    audioRef.current?.play().catch(console.error);
  };

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
    <div className="h-screen w-full relative bg-black">
      <audio
        ref={audioRef}
        src="/audio/utah2026-voiceover.mp3"
        preload="auto"
        onEnded={handleEnded}
      />

      {!started && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">WMC Utah 2026</h1>
            <p className="text-lg text-white/70">Click to begin the narrated tour</p>
            <Button size="lg" onClick={handleStart} className="gap-2 text-base px-8 py-6 rounded-full">
              <Play className="h-5 w-5" /> Start Experience
            </Button>
          </div>
        </div>
      )}

      {started && (
        <>
          <Button
            onClick={toggleAudio}
            variant="secondary"
            size="icon"
            className="absolute top-16 left-4 z-[9999] rounded-full shadow-lg opacity-90 hover:opacity-100"
            title={isPlaying ? "Mute voiceover" : "Play voiceover"}
          >
            {isPlaying ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>

          <iframe
            title="WMC Utah 2026"
            width="100%"
            height="100%"
            src="https://ion.cesium.com/stories/viewer/?id=3b83c565-be61-4509-b89a-b31235d7d3c1&play=1"
            frameBorder="0"
            allow="fullscreen"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </>
      )}
    </div>
  );
}
