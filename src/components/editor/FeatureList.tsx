// Feature List component for displaying venue features

import { MapPin, Spline, Hexagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VenueFeature } from '@/types/feature';
import { cn } from '@/lib/utils';

interface FeatureListProps {
  features: VenueFeature[];
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
}

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
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => onSelectFeature(feature.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors",
              selectedFeatureId === feature.id
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted/50 border border-transparent"
            )}
          >
            <FeatureTypeIcon type={feature.type} color={feature.style.color} />
            <span className="flex-1 text-xs truncate">{feature.name}</span>
            <Badge
              variant={feature.status === 'published' ? 'default' : 'secondary'}
              className="text-[10px] px-1.5 py-0"
            >
              {feature.status === 'published' ? 'pub' : 'draft'}
            </Badge>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
