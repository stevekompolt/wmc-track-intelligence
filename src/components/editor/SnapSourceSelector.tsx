import { Magnet, Target, RotateCcw, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SnapSource } from '@/types/overlay';

interface SnapSourceSelectorProps {
  snapSource: SnapSource;
  autoFitOnLoad: boolean;
  isLocked: boolean;
  isPreviewingSnap: boolean;
  hasValidImage: boolean;
  onSnapSourceChange: (source: SnapSource) => void;
  onAutoFitChange: (enabled: boolean) => void;
  onSnapNow: () => void;
  onReSnap: () => void;
  onResetToFree: () => void;
}

export function SnapSourceSelector({
  snapSource,
  autoFitOnLoad,
  isLocked,
  isPreviewingSnap,
  hasValidImage,
  onSnapSourceChange,
  onAutoFitChange,
  onSnapNow,
  onReSnap,
  onResetToFree,
}: SnapSourceSelectorProps) {
  return (
    <div className="space-y-3">
      {/* Snap Source Dropdown */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Snap Source</Label>
        <Select
          value={snapSource}
          onValueChange={(v) => onSnapSourceChange(v as SnapSource)}
          disabled={isLocked}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select snap source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="venue_bounds">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Venue Bounds
              </div>
            </SelectItem>
            <SelectItem value="geometry" disabled>
              <div className="flex items-center gap-2 opacity-50">
                <span>Geometry</span>
                <span className="text-xs">(coming soon)</span>
              </div>
            </SelectItem>
            <SelectItem value="element" disabled>
              <div className="flex items-center gap-2 opacity-50">
                <span>Element</span>
                <span className="text-xs">(coming soon)</span>
              </div>
            </SelectItem>
            <SelectItem value="viewpoint" disabled>
              <div className="flex items-center gap-2 opacity-50">
                <span>Viewpoint</span>
                <span className="text-xs">(coming soon)</span>
              </div>
            </SelectItem>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                Free Placement
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant={isPreviewingSnap ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={onSnapNow}
          disabled={isLocked || snapSource === 'none' || !hasValidImage}
        >
          <Magnet className="h-3 w-3 mr-1" />
          Snap Now
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onReSnap}
          disabled={isLocked || snapSource === 'none' || !hasValidImage}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Re-Snap
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={onResetToFree}
        disabled={isLocked || snapSource === 'none'}
      >
        <Crosshair className="h-3 w-3 mr-1" />
        Reset to Free Placement
      </Button>

      {/* Auto-fit toggle */}
      <div className="flex items-center justify-between pt-1">
        <Label className="text-xs text-muted-foreground">
          Auto-fit when image changes
        </Label>
        <Switch
          checked={autoFitOnLoad}
          onCheckedChange={onAutoFitChange}
          disabled={isLocked}
        />
      </div>
    </div>
  );
}
