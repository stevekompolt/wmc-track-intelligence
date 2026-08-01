// Collapsible wrapper for the unified map item list

import { useState } from 'react';
import { Layers, ChevronDown, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { LayerTree } from './LayerTree';
import type { MapItem } from './MapItemList';
import type { VenueFeature, FeatureGroup } from '@/types/feature';
import type { MapOverlay } from '@/types/overlay';

interface CollapsibleMapItemListProps {
  features: VenueFeature[];
  groups: FeatureGroup[];
  overlays: MapOverlay[];
  selectedItemId: string | null;
  selectedItemType: 'feature' | 'overlay' | null;
  activeGroupId: string | null;
  onSelectItem: (id: string | null, type: 'feature' | 'overlay' | null) => void;
  onSetActiveGroup: (groupId: string | null) => void;
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  hiddenFeatureIds: Set<string>;
  hiddenOverlayIds: Set<string>;
  onToggleFeatureVisibility: (featureId: string) => void;
  onToggleGroupVisibility: (groupId: string, hide: boolean) => void;
  onToggleOverlayVisibility: (overlayId: string) => void;
  onDeleteItem?: (id: string, type: 'feature' | 'overlay') => void;
}

export function CollapsibleMapItemList({
  features,
  groups,
  overlays,
  selectedItemId,
  selectedItemType,
  activeGroupId,
  onSelectItem,
  onSetActiveGroup,
  onAddGroup,
  onRenameGroup,
  onDeleteGroup,
  hiddenFeatureIds,
  hiddenOverlayIds,
  onToggleFeatureVisibility,
  onToggleGroupVisibility,
  onToggleOverlayVisibility,
  onDeleteItem,
}: CollapsibleMapItemListProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Root-level items: overlays plus features that don't belong to a layer
  const rootItems: MapItem[] = [
    ...overlays.map(o => ({ type: 'overlay' as const, data: o })),
    ...features.filter(f => !f.groupId).map(f => ({ type: 'feature' as const, data: f })),
  ].sort((a, b) => a.data.zOrder - b.data.zOrder);

  // Combined hidden item IDs
  const hiddenItemIds = new Set([...hiddenFeatureIds, ...hiddenOverlayIds]);

  const totalCount = groups.length + rootItems.length;

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
      <div className="w-full border-b border-border flex items-center justify-between pr-2">
        <CollapsibleTrigger className="flex-1 p-3 flex items-center justify-between hover:bg-muted/50 transition-colors focus-visible:ring-primary/50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Layers className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-semibold tracking-wider">
              MAP LAYERS ({totalCount})
            </h2>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddGroup}
          className="h-7 px-2 text-xs shrink-0 hover:border-primary hover:text-primary focus-visible:ring-primary/50"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Layer
        </Button>
      </div>
      <CollapsibleContent>
        <LayerTree
          groups={groups}
          features={features}
          rootItems={rootItems}
          selectedItemId={selectedItemId}
          selectedItemType={selectedItemType}
          activeGroupId={activeGroupId}
          hiddenItemIds={hiddenItemIds}
          onSelectItem={handleSelectItem}
          onSetActiveGroup={onSetActiveGroup}
          onToggleVisibility={handleToggleVisibility}
          onToggleGroupVisibility={onToggleGroupVisibility}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
          onDeleteItem={onDeleteItem}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}
