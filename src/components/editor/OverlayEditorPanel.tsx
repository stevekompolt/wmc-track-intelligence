import { useState, useRef, ChangeEvent } from 'react';
import { 
  ImagePlus, 
  Upload, 
  Copy, 
  Check, 
  RotateCcw, 
  Move,
  GripHorizontal,
  Lock,
  Unlock,
  Save,
  Undo2,
  Layers,
  Trash2,
  AlertTriangle,
  Loader2,
  FolderOpen
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
import { SnapSourceSelector } from './SnapSourceSelector';
import { MediaAssetBrowser } from './MediaAssetBrowser';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  uploadOverlayImage,
  validateOverlayFile,
  findDuplicateAsset,
} from '@/services/mediaAssetsApi';
import type { MapOverlay, BoundingBox, OverlayStatus, SnapSource } from '@/types/overlay';

export interface OverlayAssetSelection {
  mediaAssetId: string;
  s3Key?: string | null;
  cdnUrl: string;
}

interface OverlayEditorPanelProps {
  overlay: MapOverlay | null;
  isDirty: boolean;
  isEditing: boolean;
  dragMode: 'none' | 'corners' | 'move';
  canUndo: boolean;
  canSave: boolean;
  lastSaved: Date | null;
  isPreviewingSnap?: boolean;
  onUpdateOverlay: (updates: Partial<MapOverlay>) => void;
  onUpdateBoundingBox: (box: Partial<BoundingBox>) => void;
  /** Attach a permanent media-system asset reference to this overlay. */
  onSetAsset: (asset: OverlayAssetSelection) => void;
  /** Organization the overlay belongs to (recorded in media metadata). */
  organizationId?: string;
  /** Media asset ids already used by track overlays (media browser filter). */
  trackOverlayAssetIds?: string[];
  onSetEditing: (editing: boolean) => void;
  onSetDragMode: (mode: 'none' | 'corners' | 'move') => void;
  onCenterOnVenue: () => void;
  onFitToVenueBounds: () => void;
  onResetPlacement: () => void;
  onToggleLock: () => void;
  onSetStatus: (status: OverlayStatus) => void;
  onUndo: () => void;
  onCreateOverlay: () => void;
  // Snapping callbacks
  onSetSnapSource?: (source: SnapSource) => void;
  onSetAutoFitOnLoad?: (enabled: boolean) => void;
  onSnapNow?: () => void;
  onReSnap?: () => void;
  onResetToFree?: () => void;
  onDelete?: () => void;
}

export function OverlayEditorPanel({
  overlay,
  isDirty,
  isEditing,
  dragMode,
  canUndo,
  canSave,
  lastSaved,
  isPreviewingSnap = false,
  onUpdateOverlay,
  onUpdateBoundingBox,
  onSetAsset,
  organizationId = 'WMC',
  trackOverlayAssetIds = [],
  onSetEditing,
  onSetDragMode,
  onCenterOnVenue,
  onFitToVenueBounds,
  onResetPlacement,
  onToggleLock,
  onSetStatus,
  onUndo,
  onCreateOverlay,
  onSetSnapSource,
  onSetAutoFitOnLoad,
  onSnapNow,
  onReSnap,
  onDelete,
  onResetToFree,
}: OverlayEditorPanelProps) {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);

  /**
   * Overlay images are stored by the media system (Wasabi via
   * media.worldmotoclash.com) using its existing presign -> PUT -> finalize
   * pipeline. This app only records the returned media asset reference.
   */
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !overlay) return;

    const invalid = validateOverlayFile(file);
    if (invalid) {
      toast({ title: 'Unsupported image', description: invalid, variant: 'destructive' });
      return;
    }

    setUploadProgress(1);
    try {
      const duplicate = await findDuplicateAsset(file);
      if (duplicate) {
        onSetAsset({
          mediaAssetId: duplicate.id,
          s3Key: duplicate.s3Key,
          cdnUrl: duplicate.url,
        });
        toast({
          title: 'Reused existing media',
          description: `"${duplicate.title}" is already in the media library — referenced instead of re-uploaded.`,
        });
        return;
      }

      const uploaded = await uploadOverlayImage(
        file,
        {
          assetType: 'track-overlay',
          organizationId,
          venueId: overlay.venueId,
          overlayId: overlay.id,
          overlayName: overlay.name || file.name,
        },
        setUploadProgress,
      );

      onSetAsset({
        mediaAssetId: uploaded.mediaAssetId,
        s3Key: uploaded.s3Key,
        cdnUrl: uploaded.cdnUrl,
      });
      toast({ title: 'Overlay image uploaded', description: 'Stored in the WMC media library.' });
    } catch (err) {
      console.error('Overlay upload failed:', err);
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload the overlay image.',
        variant: 'destructive',
      });
    } finally {
      setUploadProgress(null);
    }
  };

  const copyImageUrl = () => {
    if (!overlay?.imageUrl) return;
    navigator.clipboard.writeText(overlay.imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Local state for coordinate editing to prevent format-fighting
  const [editingCoord, setEditingCoord] = useState<{ field: string; value: string } | null>(null);

  const formatCoordinate = (value: number) => value.toFixed(6);

  const handleCoordFocus = (field: string, value: number) => {
    setEditingCoord({ field, value: value.toString() });
  };

  const handleCoordChange = (field: string, rawValue: string) => {
    setEditingCoord({ field, value: rawValue });
  };

  const handleCoordBlur = (field: string) => {
    if (editingCoord?.field === field) {
      const parsed = parseFloat(editingCoord.value);
      if (!isNaN(parsed)) {
        onUpdateBoundingBox({ [field]: parsed });
      }
      setEditingCoord(null);
    }
  };

  const getCoordValue = (field: string, value: number): string => {
    if (editingCoord?.field === field) return editingCoord.value;
    return formatCoordinate(value);
  };

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

  const hasValidImage = overlay.imageUrl.length > 0;
  const hasValidBounds = overlay.boundingBox.north > overlay.boundingBox.south && overlay.boundingBox.east > overlay.boundingBox.west;
  const missingImage = !hasValidImage && hasValidBounds;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Warning: overlay has bounds but no linked media asset */}
        {missingImage && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>No media asset linked yet — upload or choose an image.</span>
          </div>
        )}
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
            onClick={() => uploadProgress === null && fileInputRef.current?.click()}
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
                  Click to upload PNG, JPEG or WebP
                </p>
              </div>
            )}
            {uploadProgress !== null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <Progress value={uploadProgress} className="w-3/4" />
                <p className="text-xs text-muted-foreground">Uploading to media library… {uploadProgress}%</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={uploadProgress !== null || overlay.isLocked}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {overlay.imageUrl ? 'Replace Image' : 'Upload New'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={uploadProgress !== null || overlay.isLocked}
              onClick={() => setBrowserOpen(true)}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Choose Existing
            </Button>
          </div>

          <MediaAssetBrowser
            open={browserOpen}
            onOpenChange={setBrowserOpen}
            trackOverlayAssetIds={trackOverlayAssetIds}
            onSelect={(asset) =>
              onSetAsset({ mediaAssetId: asset.id, s3Key: asset.s3Key, cdnUrl: asset.url })
            }
          />

          {overlay.imageUrl && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={copyImageUrl}
            >
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              Copy CDN URL
            </Button>
          )}

          {/* Resolved media reference (read-only) */}
          {overlay.imageUrl && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Media asset {overlay.mediaAssetId ? `(${overlay.mediaAssetId.slice(0, 8)}…)` : ''}
              </Label>
              <Input 
                value={overlay.imageUrl} 
                readOnly 
                className="text-xs font-mono bg-secondary/50"
              />
            </div>
          )}
        </section>

        <Separator />

        {/* Section 2: Snapping Controls (NEW - Primary UX) */}
        {onSetSnapSource && (
          <>
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Snapping
              </h3>
              <SnapSourceSelector
                snapSource={overlay.snapSource || 'venue_bounds'}
                autoFitOnLoad={overlay.autoFitOnLoad ?? true}
                isLocked={overlay.isLocked}
                isPreviewingSnap={isPreviewingSnap}
                hasValidImage={hasValidImage}
                onSnapSourceChange={onSetSnapSource}
                onAutoFitChange={onSetAutoFitOnLoad || (() => {})}
                onSnapNow={onSnapNow || (() => {})}
                onReSnap={onReSnap || (() => {})}
                onResetToFree={onResetToFree || (() => {})}
              />
            </section>
            <Separator />
          </>
        )}

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

        {/* Section 6: Bounding Box Coordinates */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Coordinates
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">North</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={getCoordValue('north', overlay.boundingBox.north)}
                onFocus={() => handleCoordFocus('north', overlay.boundingBox.north)}
                onChange={(e) => handleCoordChange('north', e.target.value)}
                onBlur={() => handleCoordBlur('north')}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">South</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={getCoordValue('south', overlay.boundingBox.south)}
                onFocus={() => handleCoordFocus('south', overlay.boundingBox.south)}
                onChange={(e) => handleCoordChange('south', e.target.value)}
                onBlur={() => handleCoordBlur('south')}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">East</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={getCoordValue('east', overlay.boundingBox.east)}
                onFocus={() => handleCoordFocus('east', overlay.boundingBox.east)}
                onChange={(e) => handleCoordChange('east', e.target.value)}
                onBlur={() => handleCoordBlur('east')}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">West</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={getCoordValue('west', overlay.boundingBox.west)}
                onFocus={() => handleCoordFocus('west', overlay.boundingBox.west)}
                onChange={(e) => handleCoordChange('west', e.target.value)}
                onBlur={() => handleCoordBlur('west')}
                className="text-xs font-mono"
                disabled={overlay.isLocked}
              />
            </div>
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

        {/* Delete Overlay */}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Overlay
          </Button>
        )}

        {/* Validation warnings */}
        {!canSave && overlay.imageUrl === '' && (
          <p className="text-xs text-destructive">
            ⚠ Image is required
          </p>
        )}
        {overlay.imageUrl && overlay.boundingBox.north <= overlay.boundingBox.south && (
          <p className="text-xs text-amber-500">
            ⚠ Positioning overlay...
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
