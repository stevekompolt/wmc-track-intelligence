// Layer tree: named layers (groups) containing individual features, plus
// root-level items (ungrouped features and overlays).

import { useState } from 'react';
import {
  MapPin, Spline, Hexagon, Eye, EyeOff, ImageIcon, Trash2,
  ChevronRight, FolderOpen, Folder, Plus,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { VenueFeature, FeatureGroup } from '@/types/feature';
import type { MapItem } from './MapItemList';
import { cn } from '@/lib/utils';

interface LayerTreeProps {
  groups: FeatureGroup[];
  features: VenueFeature[];
  rootItems: MapItem[];
  selectedItemId: string | null;
  selectedItemType: 'feature' | 'overlay' | null;
  activeGroupId: string | null;
  hiddenItemIds: Set<string>;
  onSelectItem: (id: string, type: 'feature' | 'overlay') => void;
  onSetActiveGroup: (groupId: string | null) => void;
  onToggleVisibility: (id: string, type: 'feature' | 'overlay') => void;
  onToggleGroupVisibility: (groupId: string, hide: boolean) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteItem?: (id: string, type: 'feature' | 'overlay') => void;
}

const FeatureTypeIcon = ({ type, color }: { type: VenueFeature['type']; color: string }) => {
  const iconClass = 'h-3.5 w-3.5';
  switch (type) {
    case 'point':
      return <MapPin className={iconClass} style={{ color }} />;
    case 'line':
      return <Spline className={iconClass} style={{ color }} />;
    case 'polygon':
      return <Hexagon className={iconClass} style={{ color }} />;
  }
};

const StatusBadge = ({ status }: { status: 'draft' | 'published' | 'archived' }) => (
  <Badge
    variant={status === 'published' ? 'default' : 'secondary'}
    className="text-[10px] px-1.5 py-0"
  >
    {status === 'published' ? 'pub' : status === 'archived' ? 'arc' : 'draft'}
  </Badge>
);

export function LayerTree({
  groups,
  features,
  rootItems,
  selectedItemId,
  selectedItemType,
  activeGroupId,
  hiddenItemIds,
  onSelectItem,
  onSetActiveGroup,
  onToggleVisibility,
  onToggleGroupVisibility,
  onRenameGroup,
  onDeleteGroup,
  onDeleteItem,
}: LayerTreeProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { kind: 'item'; id: string; type: 'feature' | 'overlay'; name: string }
    | { kind: 'group'; id: string; name: string; count: number }
    | null
  >(null);

  const toggleCollapsed = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const commitRename = (groupId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) onRenameGroup(groupId, trimmed);
    setRenamingId(null);
  };

  const confirmDelete = () => {
    if (deleteConfirm?.kind === 'group') {
      onDeleteGroup(deleteConfirm.id);
    } else if (deleteConfirm?.kind === 'item' && onDeleteItem) {
      onDeleteItem(deleteConfirm.id, deleteConfirm.type);
    }
    setDeleteConfirm(null);
  };

  const renderFeatureRow = (feature: VenueFeature, indented: boolean) => {
    const isHidden = hiddenItemIds.has(feature.id);
    const isSelected = selectedItemId === feature.id && selectedItemType === 'feature';
    return (
      <div
        key={`feature-${feature.id}`}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
          indented && 'ml-4',
          isSelected
            ? 'bg-primary/10 border border-primary/30'
            : 'hover:bg-muted/50 border border-transparent',
          isHidden && 'opacity-50',
        )}
      >
        <button
          onClick={() => onSelectItem(feature.id, 'feature')}
          className="flex-1 flex items-center gap-2 text-left min-w-0 focus-visible:ring-primary/50"
        >
          <FeatureTypeIcon type={feature.type} color={feature.style.color} />
          <span className="flex-1 text-xs truncate">{feature.name}</span>
        </button>
        <button
          onClick={() => onToggleVisibility(feature.id, 'feature')}
          className="p-1 hover:bg-muted rounded transition-colors focus-visible:ring-primary/50"
          title={isHidden ? 'Show on map' : 'Hide on map'}
        >
          {isHidden ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {onDeleteItem && (
          <button
            onClick={() =>
              setDeleteConfirm({ kind: 'item', id: feature.id, type: 'feature', name: feature.name })
            }
            className="p-1 hover:bg-destructive/10 rounded transition-colors focus-visible:ring-primary/50"
            title="Delete shape"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        )}
        <StatusBadge status={feature.status} />
      </div>
    );
  };

  const renderOverlayRow = (item: Extract<MapItem, { type: 'overlay' }>) => {
    const isHidden = hiddenItemIds.has(item.data.id);
    const isSelected = selectedItemId === item.data.id && selectedItemType === 'overlay';
    return (
      <div
        key={`overlay-${item.data.id}`}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors',
          isSelected
            ? 'bg-primary/10 border border-primary/30'
            : 'hover:bg-muted/50 border border-transparent',
          isHidden && 'opacity-50',
        )}
      >
        <button
          onClick={() => onSelectItem(item.data.id, 'overlay')}
          className="flex-1 flex items-center gap-2 text-left min-w-0 focus-visible:ring-primary/50"
        >
          <ImageIcon className="h-3.5 w-3.5 text-primary" />
          <span className="flex-1 text-xs truncate">{item.data.name}</span>
        </button>
        <button
          onClick={() => onToggleVisibility(item.data.id, 'overlay')}
          className="p-1 hover:bg-muted rounded transition-colors focus-visible:ring-primary/50"
          title={isHidden ? 'Show on map' : 'Hide on map'}
        >
          {isHidden ? (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        {onDeleteItem && (
          <button
            onClick={() =>
              setDeleteConfirm({ kind: 'item', id: item.data.id, type: 'overlay', name: item.data.name })
            }
            className="p-1 hover:bg-destructive/10 rounded transition-colors focus-visible:ring-primary/50"
            title="Delete overlay"
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        )}
        <StatusBadge status={item.data.status} />
      </div>
    );
  };

  const isEmpty = groups.length === 0 && rootItems.length === 0;

  return (
    <>
      <ScrollArea className="h-[240px]">
        <div className="p-1 space-y-0.5">
          {isEmpty && (
            <div className="p-2 text-xs text-muted-foreground font-mono">
              No layers yet. Use "Add Layer", then draw shapes into it.
            </div>
          )}

          {groups.map((group) => {
            const children = features
              .filter((f) => f.groupId === group.id)
              .sort((a, b) => a.zOrder - b.zOrder);
            const isCollapsed = collapsedGroups.has(group.id);
            const isActive = activeGroupId === group.id;
            const allHidden = children.length > 0 && children.every((c) => hiddenItemIds.has(c.id));

            return (
              <div key={group.id}>
                <div
                  className={cn(
                    'w-full flex items-center gap-1.5 px-2 py-1.5 rounded transition-colors',
                    isActive
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50 border border-transparent',
                  )}
                >
                  <button
                    onClick={() => toggleCollapsed(group.id)}
                    className="p-0.5 focus-visible:ring-primary/50"
                    title={isCollapsed ? 'Expand layer' : 'Collapse layer'}
                  >
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 text-muted-foreground transition-transform',
                        !isCollapsed && 'rotate-90',
                      )}
                    />
                  </button>
                  {isCollapsed ? (
                    <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                  {renamingId === group.id ? (
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(group.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(group.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="h-6 flex-1 text-xs"
                    />
                  ) : (
                    <button
                      onClick={() => onSetActiveGroup(isActive ? null : group.id)}
                      onDoubleClick={() => {
                        setRenamingId(group.id);
                        setRenameValue(group.name);
                      }}
                      className="flex-1 text-left min-w-0 focus-visible:ring-primary/50"
                      title="Click to target new shapes here • double-click to rename"
                    >
                      <span className="text-xs font-semibold truncate">{group.name}</span>
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        {children.length}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => onToggleGroupVisibility(group.id, !allHidden)}
                    className="p-1 hover:bg-muted rounded transition-colors focus-visible:ring-primary/50"
                    title={allHidden ? 'Show all in layer' : 'Hide all in layer'}
                  >
                    {allHidden ? (
                      <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        kind: 'group',
                        id: group.id,
                        name: group.name,
                        count: children.length,
                      })
                    }
                    className="p-1 hover:bg-destructive/10 rounded transition-colors focus-visible:ring-primary/50"
                    title="Delete layer"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {children.map((child) => renderFeatureRow(child, true))}
                    {children.length === 0 && (
                      <div className="ml-6 px-2 py-1 text-[11px] font-mono text-muted-foreground">
                        {isActive ? 'Draw a shape to add it here' : 'Empty — select to target'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {rootItems.map((item) =>
            item.type === 'overlay' ? renderOverlayRow(item) : renderFeatureRow(item.data, false),
          )}
        </div>
      </ScrollArea>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.kind === 'group' ? 'Delete Layer?' : 'Delete Item?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.kind === 'group'
                ? `This will permanently delete "${deleteConfirm.name}" and its ${deleteConfirm.count} shape(s).`
                : `This will permanently delete "${deleteConfirm?.name}" from the map.`}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}