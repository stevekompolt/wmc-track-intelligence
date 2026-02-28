import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lookupContactByEmail, trackPortalLogin } from "@/services/portalTrackingService";

const CESIUM_URL =
  "https://ion.cesium.com/stories/viewer/?id=966945c1-aa36-4587-97ae-6ceba881c585&play";

export default function PublicExperience() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
  };

  return (
    <div className="h-screen w-screen relative">
      {!started && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-4xl font-bold text-white tracking-tight">WMC Experience</h1>
            <p className="text-lg text-white/70">Click to begin the narrated tour</p>
            <Button size="lg" onClick={handleStart} className="gap-2 text-base px-8 py-6 rounded-full">
              <Play className="h-5 w-5" /> Start Experience
            </Button>
          </div>
        </div>
      )}

      {started && (
        <iframe
          title="WMC Experience"
          width="100%"
          height="100%"
          src={CESIUM_URL}
          frameBorder="0"
          allow="fullscreen"
          allowFullScreen
          className="h-full w-full border-0"
        />
      )}
    </div>
  );
}
