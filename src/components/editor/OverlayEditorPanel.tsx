import { useState, useRef, ChangeEvent } from 'react';
import { 
  ImagePlus, 
  Upload, 
  Copy, 
  Check, 
  RotateCcw, 
  Crosshair, 
  Maximize2,
  Move,
  GripHorizontal,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Save,
  Undo2,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MapOverlay, BoundingBox, OverlayStatus } from '@/types/overlay';

interface OverlayEditorPanelProps {
  overlay: MapOverlay | null;
  isDirty: boolean;
  isEditing: boolean;
  dragMode: 'none' | 'corners' | 'move';
  canUndo: boolean;
  canSave: boolean;
  lastSaved: Date | null;
  onUpdateOverlay: (updates: Partial<MapOverlay>) => void;
  onUpdateBoundingBox: (box: Partial<BoundingBox>) => void;
  onSetImageUrl: (url: string) => void;
  onSetEditing: (editing: boolean) => void;
  onSetDragMode: (mode: 'none' | 'corners' | 'move') => void;
  onCenterOnVenue: () => void;
  onFitToVenueBounds: () => void;
  onResetPlacement: () => void;
  onToggleLock: () => void;
  onSetStatus: (status: OverlayStatus) => void;
  onUndo: () => void;
  onCreateOverlay: () => void;
}

export function OverlayEditorPanel({
  overlay,
  isDirty,
  isEditing,
  dragMode,
  canUndo,
  canSave,
  lastSaved,
  onUpdateOverlay,
  onUpdateBoundingBox,
  onSetImageUrl,
  onSetEditing,
  onSetDragMode,
  onCenterOnVenue,
  onFitToVenueBounds,
  onResetPlacement,
  onToggleLock,
  onSetStatus,
  onUndo,
  onCreateOverlay,
}: OverlayEditorPanelProps) {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create object URL for preview (in production, upload to storage)
    const url = URL.createObjectURL(file);
    onSetImageUrl(url);
  };

  const copyImageUrl = () => {
    if (!overlay?.imageUrl) return;
    navigator.clipboard.writeText(overlay.imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCoordinate = (value: number) => value.toFixed(6);

  if (!overlay) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-display text-lg mb-2">No Overlay Selected</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create a new map overlay to get started
        </p>
        <Button onClick={onCreateOverlay}>
          <ImagePlus className="h-4 w-4 mr-2" />
          New Overlay
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Header with status */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            OVERLAY EDITOR
          </h2>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Badge variant="outline" className="text-xs">
                Unsaved
              </Badge>
            )}
            {lastSaved && !isDirty && (
              <Badge variant="secondary" className="text-xs">
                <Check className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
          </div>
        </div>

        {/* Section 1: Overlay Asset */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Overlay Asset
          </h3>
          
          {/* Image Preview / Upload */}
          <div 
            className={cn(
              "relative aspect-video rounded-md border-2 border-dashed overflow-hidden",
              "bg-secondary/50 flex items-center justify-center cursor-pointer",
              "hover:border-primary/50 transition-colors",
              overlay.imageUrl && "border-solid border-border"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {overlay.imageUrl ? (
              <img 
                src={overlay.imageUrl} 
                alt="Overlay preview" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">
                  Click to upload PNG/SVG
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {overlay.imageUrl && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace Image
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyImageUrl}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Image URL (read-only) */}
          {overlay.imageUrl && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Image URL</Label>
              <Input 
                value={overlay.imageUrl} 
                readOnly 
                className="text-xs font-mono bg-secondary/50"
              />
            </div>
          )}
        </section>

        <Separator />

        {/* Section 2: Placement Controls */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Placement
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">North</Label>
              <Input
                type="number"
                step="0.000001"
                value={formatCoordinate(overlay.boundingBox.north)}
                onChange={(e) => onUpdateBoundingBox({ north: parseFloat(e.target.value) || 0 })}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">South</Label>
              <Input
                type="number"
                step="0.000001"
                value={formatCoordinate(overlay.boundingBox.south)}
                onChange={(e) => onUpdateBoundingBox({ south: parseFloat(e.target.value) || 0 })}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">East</Label>
              <Input
                type="number"
                step="0.000001"
                value={formatCoordinate(overlay.boundingBox.east)}
                onChange={(e) => onUpdateBoundingBox({ east: parseFloat(e.target.value) || 0 })}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">West</Label>
              <Input
                type="number"
                step="0.000001"
                value={formatCoordinate(overlay.boundingBox.west)}
                onChange={(e) => onUpdateBoundingBox({ west: parseFloat(e.target.value) || 0 })}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onCenterOnVenue}
              disabled={overlay.isLocked}
            >
              <Crosshair className="h-3 w-3 mr-1" />
              Center
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onFitToVenueBounds}
              disabled={overlay.isLocked}
            >
              <Maximize2 className="h-3 w-3 mr-1" />
              Fit
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={onResetPlacement}
              disabled={overlay.isLocked || !canUndo}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </section>

        <Separator />

        {/* Section 3: Visual Controls */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Visual
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Opacity</Label>
              <span className="text-xs font-mono text-muted-foreground">
                {Math.round(overlay.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[overlay.opacity * 100]}
              onValueChange={([v]) => onUpdateOverlay({ opacity: v / 100 })}
              min={0}
              max={100}
              step={1}
              disabled={overlay.isLocked}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Z-Order</Label>
            <Input
              type="number"
              value={overlay.zOrder}
              onChange={(e) => onUpdateOverlay({ zOrder: parseInt(e.target.value) || 0 })}
              className="text-xs font-mono"
              disabled={overlay.isLocked}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Visibility</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Fans</span>
                <Switch
                  checked={overlay.visibleToFans}
                  onCheckedChange={(v) => onUpdateOverlay({ visibleToFans: v })}
                  disabled={overlay.isLocked}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Media</span>
                <Switch
                  checked={overlay.visibleToMedia}
                  onCheckedChange={(v) => onUpdateOverlay({ visibleToMedia: v })}
                  disabled={overlay.isLocked}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Ops</span>
                <Switch
                  checked={overlay.visibleToOps}
                  onCheckedChange={(v) => onUpdateOverlay({ visibleToOps: v })}
                  disabled={overlay.isLocked}
                />
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Section 4: Interaction Tools */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Interaction
          </h3>
          
          <div className="flex gap-2">
            <Toggle
              pressed={dragMode === 'corners'}
              onPressedChange={(p) => onSetDragMode(p ? 'corners' : 'none')}
              disabled={overlay.isLocked}
              className="flex-1"
              aria-label="Drag corners"
            >
              <GripHorizontal className="h-4 w-4 mr-1" />
              Corners
            </Toggle>
            <Toggle
              pressed={dragMode === 'move'}
              onPressedChange={(p) => onSetDragMode(p ? 'move' : 'none')}
              disabled={overlay.isLocked}
              className="flex-1"
              aria-label="Move overlay"
            >
              <Move className="h-4 w-4 mr-1" />
              Move
            </Toggle>
          </div>

          <Button
            variant={overlay.isLocked ? 'default' : 'outline'}
            size="sm"
            className="w-full"
            onClick={onToggleLock}
          >
            {overlay.isLocked ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Locked
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Lock Overlay
              </>
            )}
          </Button>
        </section>

        <Separator />

        {/* Section 5: Metadata */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Metadata
          </h3>
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={overlay.name}
              onChange={(e) => onUpdateOverlay({ name: e.target.value })}
              placeholder="Overlay name"
              disabled={overlay.isLocked}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={overlay.description || ''}
              onChange={(e) => onUpdateOverlay({ description: e.target.value })}
              placeholder="Optional description"
              rows={2}
              disabled={overlay.isLocked}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={overlay.status}
              onValueChange={(v) => onSetStatus(v as OverlayStatus)}
              disabled={overlay.isLocked}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            disabled={!canSave || !isDirty}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>

        {/* Validation warnings */}
        {!canSave && overlay.imageUrl === '' && (
          <p className="text-xs text-destructive">
            ⚠ Image is required
          </p>
        )}
        {!canSave && overlay.boundingBox.north <= overlay.boundingBox.south && (
          <p className="text-xs text-destructive">
            ⚠ Invalid bounding box
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
