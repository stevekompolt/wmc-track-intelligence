// Feature List component for displaying venue features

import { MapPin, Spline, Hexagon, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VenueFeature } from '@/types/feature';
import { cn } from '@/lib/utils';

interface FeatureListProps {
  features: VenueFeature[];
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
  hiddenFeatureIds?: Set<string>;
  onToggleVisibility?: (featureId: string) => void;
}

const EMPTY_SET = new Set<string>();

const FeatureTypeIcon = ({ type, color }: { type: VenueFeature['type']; color: string }) => {
  const iconClass = "h-3.5 w-3.5";
  
  switch (type) {
    case 'point':
      return <MapPin className={iconClass} style={{ color }} />;
    case 'line':
      return <Spline className={iconClass} style={{ color }} />;
    case 'polygon':
      return <Hexagon className={iconClass} style={{ color }} />;
  }
};

export function FeatureList({
  features,
  selectedFeatureId,
  onSelectFeature,
  hiddenFeatureIds = EMPTY_SET,
  onToggleVisibility,
}: FeatureListProps) {
  if (features.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground font-mono">
        No features yet. Use the tools above to draw.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="p-1">
        {features.map((feature) => {
          const isHidden = hiddenFeatureIds.has(feature.id);
          return (
            <div
              key={feature.id}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors",
                selectedFeatureId === feature.id
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/50 border border-transparent",
                isHidden && "opacity-50"
              )}
            >
              <button
                onClick={() => onSelectFeature(feature.id)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                <FeatureTypeIcon type={feature.type} color={feature.style.color} />
                <span className="flex-1 text-xs truncate">{feature.name}</span>
              </button>
              {onToggleVisibility && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(feature.id);
                  }}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title={isHidden ? "Show on map" : "Hide on map"}
                >
                  {isHidden ? (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
              <Badge
                variant={feature.status === 'published' ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0"
              >
                {feature.status === 'published' ? 'pub' : 'draft'}
              </Badge>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
