import { useEffect, useState } from 'react';
import { Search, ImageOff, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { listImageAssets, type MediaAsset } from '@/services/mediaAssetsApi';

interface MediaAssetBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Media asset ids already referenced by track overlays — shown as a filter. */
  trackOverlayAssetIds?: string[];
  onSelect: (asset: MediaAsset) => void;
}

export function MediaAssetBrowser({
  open,
  onOpenChange,
  trackOverlayAssetIds = [],
  onSelect,
}: MediaAssetBrowserProps) {
  const [search, setSearch] = useState('');
  const [onlyOverlays, setOnlyOverlays] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const load = async () => {
      try {
        const result = onlyOverlays
          ? trackOverlayAssetIds.length
            ? await listImageAssets({ ids: trackOverlayAssetIds })
            : []
          : await listImageAssets({ search: search || undefined });
        if (!cancelled) setAssets(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load media');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const timer = setTimeout(load, search ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, onlyOverlays, trackOverlayAssetIds.join(',')]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">MEDIA LIBRARY</DialogTitle>
          <DialogDescription>
            Images already stored in the WMC media system. Selecting one references the
            existing asset — no re-upload, no duplicate binary.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media by title"
              className="pl-8"
              disabled={onlyOverlays}
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyOverlays((v) => !v)}
            className={cn(
              'rounded-md border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              onlyOverlays
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            Track overlays
          </button>
        </div>

        <ScrollArea className="h-[420px] pr-3">
          {isLoading && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading media…
            </div>
          )}

          {!isLoading && error && (
            <p className="p-4 text-sm text-destructive">{error}</p>
          )}

          {!isLoading && !error && assets.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <ImageOff className="mb-2 h-6 w-6" />
              <p className="text-sm">No matching media assets</p>
            </div>
          )}

          {!isLoading && !error && assets.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset);
                    onOpenChange(false);
                  }}
                  className="group overflow-hidden rounded-md border border-border bg-secondary/40 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className="aspect-video bg-background/60">
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.title}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="space-y-1 p-2">
                    <p className="truncate text-xs font-medium">{asset.title}</p>
                    <div className="flex items-center gap-1">
                      {asset.fileFormat && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {asset.fileFormat}
                        </Badge>
                      )}
                      {asset.width && asset.height && (
                        <span className="text-[10px] text-muted-foreground">
                          {asset.width}×{asset.height}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}