import { useState } from 'react';
import { MapPin, Spline, Hexagon, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeatureList } from './FeatureList';
import type { VenueFeature } from '@/types/feature';

interface CollapsibleFeatureListProps {
  features: VenueFeature[];
  selectedFeature: VenueFeature | null;
  onSelectFeature: (featureId: string | null) => void;
}

const FeatureTypeIcon = ({ type, color }: { type: VenueFeature['type']; color: string }) => {
  const iconClass = "h-3 w-3";
  
  switch (type) {
    case 'point':
      return <MapPin className={iconClass} style={{ color }} />;
    case 'line':
      return <Spline className={iconClass} style={{ color }} />;
    case 'polygon':
      return <Hexagon className={iconClass} style={{ color }} />;
  }
};

export function CollapsibleFeatureList({
  features,
  selectedFeature,
  onSelectFeature,
}: CollapsibleFeatureListProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full p-3 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h2 className="font-display text-sm font-semibold tracking-wider">
            FEATURES ({features.length})
          </h2>
          {!isOpen && selectedFeature && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded text-xs truncate">
              <span className="text-muted-foreground">•</span>
              <FeatureTypeIcon type={selectedFeature.type} color={selectedFeature.style.color} />
              <span className="truncate">{selectedFeature.name}</span>
            </div>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FeatureList
          features={features}
          selectedFeatureId={selectedFeature?.id || null}
          onSelectFeature={onSelectFeature}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
