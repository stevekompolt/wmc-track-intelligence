import { Scan, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { DetectionThresholds } from '@/lib/imageAnalysis';

interface DetectTrackDialogProps {
  open: boolean;
  isDetecting: boolean;
  detectedCoords: [number, number][][] | null;
  thresholds: DetectionThresholds;
  onClose: () => void;
  onRunDetection: () => void;
  onApply: () => void;
  onUpdateThreshold: <K extends keyof DetectionThresholds>(key: K, value: DetectionThresholds[K]) => void;
}

export function DetectTrackDialog({
  open,
  isDetecting,
  detectedCoords,
  thresholds,
  onClose,
  onRunDetection,
  onApply,
  onUpdateThreshold,
}: DetectTrackDialogProps) {
  const hasDetection = detectedCoords && detectedCoords[0]?.length >= 4;
  const pointCount = hasDetection ? detectedCoords![0].length - 1 : 0; // -1 for closing point
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Detect Track Surface
          </DialogTitle>
          <DialogDescription>
            Analyze satellite imagery to automatically detect the track asphalt surface. 
            Adjust sensitivity settings and preview before applying.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Status / Preview Info */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
            {isDetecting ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Analyzing satellite imagery...</span>
              </div>
            ) : hasDetection ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Detection Complete</p>
                <p className="text-xs text-muted-foreground">
                  Found polygon with {pointCount} vertices
                </p>
                <p className="text-xs text-primary">
                  Preview shown on map (dashed blue outline)
                </p>
              </div>
            ) : detectedCoords === null && !isDetecting ? (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Position the map view over the track and click "Detect" to analyze
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">No Track Detected</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting sensitivity or ensure satellite imagery is visible
                </p>
              </div>
            )}
          </div>
          
          {/* Threshold Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Darkness Threshold</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {thresholds.maxLightness}%
                </span>
              </div>
              <Slider
                value={[thresholds.maxLightness]}
                onValueChange={([v]) => onUpdateThreshold('maxLightness', v)}
                min={10}
                max={60}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher = include lighter grays
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Color Tolerance</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {thresholds.maxSaturation}%
                </span>
              </div>
              <Slider
                value={[thresholds.maxSaturation]}
                onValueChange={([v]) => onUpdateThreshold('maxSaturation', v)}
                min={5}
                max={40}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher = allow more colored surfaces
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Minimum Area</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {thresholds.minAreaPixels}px
                </span>
              </div>
              <Slider
                value={[thresholds.minAreaPixels]}
                onValueChange={([v]) => onUpdateThreshold('minAreaPixels', v)}
                min={100}
                max={2000}
                step={100}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher = ignore smaller detected regions
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Smoothing</Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {thresholds.simplificationTolerance}px
                </span>
              </div>
              <Slider
                value={[thresholds.simplificationTolerance]}
                onValueChange={([v]) => onUpdateThreshold('simplificationTolerance', v)}
                min={1}
                max={10}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher = smoother polygon with fewer vertices
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={onRunDetection}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Detecting...
              </>
            ) : (
              <>
                <Scan className="h-4 w-4 mr-2" />
                Detect
              </>
            )}
          </Button>
          <Button 
            onClick={onApply}
            disabled={!hasDetection || isDetecting}
          >
            Apply Detection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
