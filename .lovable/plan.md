

# Add 1-Second Audio Delay on Start

## Change
**`src/pages/Utah2026.tsx`** — In `handleStart`, delay the `audio.play()` call by 1 second using `setTimeout` so the Cesium iframe has time to begin loading before the voiceover starts.

```ts
const handleStart = () => {
  setStarted(true);
  setIsPlaying(true);
  setTimeout(() => {
    audioRef.current?.play().catch(console.error);
  }, 1000);
};
```

Single file, single change.

