import { useState } from 'react';
import { Camera, Pencil, Trash2, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { getViewpointIcon } from '@/lib/viewpointIcons';
import { cn } from '@/lib/utils';

interface ViewpointManagerPanelProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ViewpointManagerPanel({ open: controlledOpen, onOpenChange }: ViewpointManagerPanelProps = {}) {
  const {
    viewpoints,
    activeViewpoint,
    setActiveViewpoint,
    setEditingViewpoint,
    removeViewpoint,
    isLoading,
  } = useViewpointContext();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeViewpoint(deleteTarget);
    } catch (e) {
      console.error('Failed to delete viewpoint:', e);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <Collapsible>
        <CollapsibleTrigger className="w-full p-3 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors">
          <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            VIEWPOINTS
          </h2>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 text-xs text-muted-foreground font-mono">Loading…</div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <>
      <Collapsible open={controlledOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="w-full p-3 border-b border-border flex items-center justify-between hover:bg-muted/50 transition-colors">
          <h2 className="font-display text-sm font-semibold tracking-wider flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            VIEWPOINTS
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {viewpoints.length}
            </Badge>
          </h2>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="max-h-[240px] overflow-y-auto">
            {viewpoints.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground font-mono">
                No viewpoints yet. Use the toolbar to save one.
              </div>
            ) : (
              viewpoints.map(vp => {
                const Icon = getViewpointIcon(vp.buttonIcon);
                const isActive = activeViewpoint?.id === vp.id;
                return (
                  <div
                    key={vp.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors group',
                      isActive && 'bg-primary/10'
                    )}
                    onClick={() => setActiveViewpoint(vp)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{vp.name}</span>
                    <Badge
                      variant={vp.status === 'published' ? 'default' : 'outline'}
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      {vp.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono w-4 text-right shrink-0">
                      {vp.priority}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingViewpoint(vp);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(vp.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Viewpoint</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this viewpoint. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
