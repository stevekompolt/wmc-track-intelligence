// Unified list component for displaying both features and overlays

import { MapPin, Spline, Hexagon, Eye, EyeOff, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { VenueFeature } from '@/types/feature';
import type { MapOverlay } from '@/types/overlay';
import { cn } from '@/lib/utils';

// Unified item type for features and overlays
export type MapItem = 
  | { type: 'feature'; data: VenueFeature }
  | { type: 'overlay'; data: MapOverlay };

interface MapItemListProps {
  items: MapItem[];
  selectedItemId: string | null;
  selectedItemType: 'feature' | 'overlay' | null;
  onSelectItem: (id: string, type: 'feature' | 'overlay') => void;
  hiddenItemIds: Set<string>;
  onToggleVisibility: (id: string, type: 'feature' | 'overlay') => void;
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

const ItemIcon = ({ item }: { item: MapItem }) => {
  if (item.type === 'overlay') {
    return <ImageIcon className="h-3.5 w-3.5 text-primary" />;
  }
  return <FeatureTypeIcon type={item.data.type} color={item.data.style.color} />;
};

const getItemName = (item: MapItem): string => {
  return item.data.name;
};

const getItemStatus = (item: MapItem): 'draft' | 'published' | 'archived' => {
  return item.data.status;
};

export function MapItemList({
  items,
  selectedItemId,
  selectedItemType,
  onSelectItem,
  hiddenItemIds = EMPTY_SET,
  onToggleVisibility,
}: MapItemListProps) {
  if (items.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground font-mono">
        No layers yet. Use the tools above to add features or overlays.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px]">
      <div className="p-1">
        {items.map((item) => {
          const isHidden = hiddenItemIds.has(item.data.id);
          const isSelected = selectedItemId === item.data.id && selectedItemType === item.type;
          const status = getItemStatus(item);
          
          return (
            <div
              key={`${item.type}-${item.data.id}`}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors",
                isSelected
                  ? "bg-primary/10 border border-primary/30"
                  : "hover:bg-muted/50 border border-transparent",
                isHidden && "opacity-50"
              )}
            >
              <button
                onClick={() => onSelectItem(item.data.id, item.type)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                <ItemIcon item={item} />
                <span className="flex-1 text-xs truncate">{getItemName(item)}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(item.data.id, item.type);
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
              <Badge
                variant={status === 'published' ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0"
              >
                {status === 'published' ? 'pub' : status === 'archived' ? 'arc' : 'draft'}
              </Badge>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
