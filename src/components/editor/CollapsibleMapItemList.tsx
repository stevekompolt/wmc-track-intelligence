// Collapsible wrapper for the unified map item list

import { useState } from 'react';
import { Layers, ChevronDown, ImageIcon, MapPin, Spline, Hexagon } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MapItemList, type MapItem } from './MapItemList';
import type { VenueFeature } from '@/types/feature';
import type { MapOverlay } from '@/types/overlay';

interface CollapsibleMapItemListProps {
  features: VenueFeature[];
  overlays: MapOverlay[];
  selectedItemId: string | null;
  selectedItemType: 'feature' | 'overlay' | null;
  onSelectItem: (id: string | null, type: 'feature' | 'overlay' | null) => void;
  hiddenFeatureIds: Set<string>;
  hiddenOverlayIds: Set<string>;
  onToggleFeatureVisibility: (featureId: string) => void;
  onToggleOverlayVisibility: (overlayId: string) => void;
  onDeleteItem?: (id: string, type: 'feature' | 'overlay') => void;
  onReorderItems?: (reorderedItems: MapItem[]) => void;
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

export function CollapsibleMapItemList({
  features,
  overlays,
  selectedItemId,
  selectedItemType,
  onSelectItem,
  hiddenFeatureIds,
  hiddenOverlayIds,
  onToggleFeatureVisibility,
  onToggleOverlayVisibility,
  onDeleteItem,
  onReorderItems,
}: CollapsibleMapItemListProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Combine features and overlays into unified list, sorted by zOrder
  const items: MapItem[] = [
    ...overlays.map(o => ({ type: 'overlay' as const, data: o })),
    ...features.map(f => ({ type: 'feature' as const, data: f })),
  ].sort((a, b) => a.data.zOrder - b.data.zOrder);

  // Combined hidden item IDs
  const hiddenItemIds = new Set([...hiddenFeatureIds, ...hiddenOverlayIds]);

  const totalCount = features.length + overlays.length;

  // Get selected item for preview when collapsed
  const selectedItem = items.find(
    i => i.data.id === selectedItemId && i.type === selectedItemType
  );

  const handleSelectItem = (id: string, type: 'feature' | 'overlay') => {
    onSelectItem(id, type);
  };

  const handleToggleVisibility = (id: string, type: 'feature' | 'overlay') => {
    if (type === 'feature') {
      onToggleFeatureVisibility(id);
    } else {
      onToggleOverlayVisibility(id);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full p-3 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="font-display text-sm font-semibold tracking-wider">
            MAP LAYERS ({totalCount})
          </h2>
          {!isOpen && selectedItem && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded text-xs truncate">
              <span className="text-muted-foreground">•</span>
              {selectedItem.type === 'overlay' ? (
                <ImageIcon className="h-3 w-3 text-primary" />
              ) : (
                <FeatureTypeIcon 
                  type={selectedItem.data.type} 
                  color={(selectedItem.data as VenueFeature).style.color} 
                />
              )}
              <span className="truncate">{selectedItem.data.name}</span>
            </div>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <MapItemList
          items={items}
          selectedItemId={selectedItemId}
          selectedItemType={selectedItemType}
          onSelectItem={handleSelectItem}
          hiddenItemIds={hiddenItemIds}
          onToggleVisibility={handleToggleVisibility}
          onDeleteItem={onDeleteItem}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
