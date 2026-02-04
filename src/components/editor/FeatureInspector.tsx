// Feature Inspector component for editing feature properties

import { useState, useEffect, useCallback } from 'react';
import { Trash2, MapPin, Spline, Hexagon, Move, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { VenueFeature, FeatureStyle, FeatureStatus, IconKey } from '@/types/feature';
import { FEATURE_COLORS, FEATURE_ICONS } from '@/types/feature';

interface FeatureInspectorProps {
  feature: VenueFeature | null;
  isEditingGeometry: boolean;
  isHidden?: boolean;
  onToggleHidden?: () => void;
  onUpdateName: (name: string) => void;
  onUpdateDescription: (description: string) => void;
  onUpdateStyle: (style: Partial<FeatureStyle>) => void;
  onUpdateVisibility: (visibility: { fans?: boolean; media?: boolean; ops?: boolean }) => void;
  onUpdateStatus: (status: FeatureStatus) => void;
  onStartEditingGeometry: () => void;
  onStopEditingGeometry: () => void;
  onDelete: () => void;
}

const FeatureTypeIcon = ({ type }: { type: VenueFeature['type'] }) => {
  switch (type) {
    case 'point':
      return <MapPin className="h-4 w-4" />;
    case 'line':
      return <Spline className="h-4 w-4" />;
    case 'polygon':
      return <Hexagon className="h-4 w-4" />;
  }
};

const formatCoordinates = (feature: VenueFeature): string => {
  if (feature.geometry.type === 'Point') {
    const [lng, lat] = feature.geometry.coordinates;
    return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
  }
  if (feature.geometry.type === 'LineString') {
    return `${feature.geometry.coordinates.length} vertices`;
  }
  if (feature.geometry.type === 'Polygon') {
    const coords = feature.geometry.coordinates[0];
    return `${coords.length - 1} vertices`; // -1 because first/last are same
  }
  return '';
};

export function FeatureInspector({
  feature,
  isEditingGeometry,
  isHidden,
  onToggleHidden,
  onUpdateName,
  onUpdateDescription,
  onUpdateStyle,
  onUpdateVisibility,
  onUpdateStatus,
  onStartEditingGeometry,
  onStopEditingGeometry,
  onDelete,
}: FeatureInspectorProps) {
  const [localName, setLocalName] = useState('');
  const [localDescription, setLocalDescription] = useState('');

  // Sync local state with feature
  useEffect(() => {
    if (feature) {
      setLocalName(feature.name);
      setLocalDescription(feature.description);
    }
  }, [feature?.id]);

  // Debounced name update
  const handleNameBlur = useCallback(() => {
    if (localName !== feature?.name) {
      onUpdateName(localName);
    }
  }, [localName, feature?.name, onUpdateName]);

  // Debounced description update
  const handleDescriptionBlur = useCallback(() => {
    if (localDescription !== feature?.description) {
      onUpdateDescription(localDescription);
    }
  }, [localDescription, feature?.description, onUpdateDescription]);

  if (!feature) {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground font-mono">
          Select a feature to view properties
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Name & Visibility Toggle */}
      <div className="space-y-2">
        <div>
          <Label htmlFor="feature-name" className="text-xs">Name</Label>
          <div className="flex items-center gap-2">
            <Input
              id="feature-name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleNameBlur}
              className="h-8 text-sm flex-1"
            />
            {onToggleHidden && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onToggleHidden}
                title={isHidden ? "Show on map" : "Hide on map"}
              >
                {isHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="feature-desc" className="text-xs">Description</Label>
          <Textarea
            id="feature-desc"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            className="text-sm min-h-[60px] resize-none"
            placeholder="Optional description..."
          />
        </div>
      </div>

      {/* Geometry Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <FeatureTypeIcon type={feature.type} />
              <span className="capitalize">{feature.type}</span>
            </div>
            <span className="font-mono">{formatCoordinates(feature)}</span>
          </div>
        </div>
        
        {isEditingGeometry ? (
          <div className="flex items-center gap-2 p-2 rounded bg-primary/10 border border-primary/20">
            <Move className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary flex-1">Drag vertices to reposition</span>
            <Button
              variant="default"
              size="sm"
              onClick={onStopEditingGeometry}
              className="h-6 px-2 text-xs"
            >
              Done
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onStartEditingGeometry}
            className="w-full h-8 text-xs"
          >
            <Move className="h-3 w-3 mr-2" />
            Edit Geometry
          </Button>
        )}
      </div>

      {/* Style Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</h3>
        
        {/* Color picker */}
        <div className="space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex flex-wrap gap-1.5">
            {FEATURE_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onUpdateStyle({ color, fillColor: color })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  feature.style.color === color
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:border-muted-foreground/50'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Opacity slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <Label className="text-xs">Stroke Opacity</Label>
            <span className="text-xs text-muted-foreground">{Math.round(feature.style.opacity * 100)}%</span>
          </div>
          <Slider
            value={[feature.style.opacity]}
            onValueChange={([v]) => onUpdateStyle({ opacity: v })}
            min={0.1}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Stroke width (for lines and polygons) */}
        {feature.type !== 'point' && (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Stroke Width</Label>
              <span className="text-xs text-muted-foreground">{feature.style.strokeWidth}px</span>
            </div>
            <Slider
              value={[feature.style.strokeWidth]}
              onValueChange={([v]) => onUpdateStyle({ strokeWidth: v })}
              min={1}
              max={8}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Fill opacity (for polygons) */}
        {feature.type === 'polygon' && (
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Fill Opacity</Label>
              <span className="text-xs text-muted-foreground">{Math.round(feature.style.fillOpacity * 100)}%</span>
            </div>
            <Slider
              value={[feature.style.fillOpacity]}
              onValueChange={([v]) => onUpdateStyle({ fillOpacity: v })}
              min={0}
              max={1}
              step={0.1}
              className="w-full"
            />
          </div>
        )}

        {/* Icon (for points) */}
        {feature.type === 'point' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Icon</Label>
            <Select
              value={feature.style.icon}
              onValueChange={(v) => onUpdateStyle({ icon: v as IconKey })}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEATURE_ICONS.map((icon) => (
                  <SelectItem key={icon.key} value={icon.key}>
                    {icon.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Visibility Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visibility</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={feature.visibleToFans}
              onCheckedChange={(v) => onUpdateVisibility({ fans: !!v })}
            />
            Fans
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={feature.visibleToMedia}
              onCheckedChange={(v) => onUpdateVisibility({ media: !!v })}
            />
            Media
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <Checkbox
              checked={feature.visibleToOps}
              onCheckedChange={(v) => onUpdateVisibility({ ops: !!v })}
            />
            Ops
          </label>
        </div>
      </div>

      {/* Status Section */}
      <div className="space-y-1.5">
        <Label className="text-xs">Status</Label>
        <Select
          value={feature.status}
          onValueChange={(v) => onUpdateStatus(v as FeatureStatus)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        className="w-full mt-2"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Feature
      </Button>
    </div>
  );
}
