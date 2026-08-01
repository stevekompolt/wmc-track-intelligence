import { useEffect, useState } from 'react';
import { Crosshair, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useTrackContext } from '@/contexts/TrackContext';
import { useTrackPick } from '@/contexts/TrackPickContext';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import { useCreateTrack } from '@/hooks/useCreateTrack';
import { getSalesforceStatus } from '@/services/salesforceAdminApi';
import { getTrackObjectInfo, formatCoordinates } from '@/services/tracksAdminApi';
import type { ExtraRequiredField } from '@/services/salesforceTrackObject';

interface PickedLocation {
  latitude: number;
  longitude: number;
  zoom: number;
}

interface NewTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTrackDialog({ open, onOpenChange }: NewTrackDialogProps) {
  const { addLocalTrack, setSelectedTrack } = useTrackContext();
  const { isPicking, startPicking, stopPicking } = useTrackPick();
  const { captureCamera } = useViewpointContext();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<PickedLocation | null>(null);
  const [extraFields, setExtraFields] = useState<ExtraRequiredField[]>([]);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState<boolean | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  const createMutation = useCreateTrack((track) => {
    addLocalTrack(track);
    setSelectedTrack(track);
  });

  // Reset + preflight (connection + object mapping) whenever the dialog opens
  useEffect(() => {
    if (!open) {
      stopPicking();
      return;
    }
    setName('');
    setDescription('');
    setPicked(null);
    setExtraFields([]);
    setExtraValues({});
    setResolveError(null);

    let cancelled = false;
    (async () => {
      const status = await getSalesforceStatus();
      if (cancelled) return;
      const isConnected = status?.status === 'connected';
      setConnected(isConnected);
      if (!isConnected) return;

      setResolving(true);
      try {
        const info = await getTrackObjectInfo();
        if (cancelled) return;
        setExtraFields(info.extraRequiredFields);
      } catch (e) {
        if (!cancelled) setResolveError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleUseThisLocation = () => {
    const cam = captureCamera();
    if (!cam) {
      toast.error('Map is not ready yet');
      return;
    }
    setPicked({ latitude: cam.latitude, longitude: cam.longitude, zoom: cam.height });
    stopPicking();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !picked) return;
    const missing = extraFields.find((f) => !extraValues[f.name]?.trim());
    if (missing) {
      toast.error(`${missing.label} is required by Salesforce`);
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        latitude: picked.latitude,
        longitude: picked.longitude,
        zoom: picked.zoom,
        description: description.trim() || undefined,
        extraFields: extraFields.length ? extraValues : undefined,
      });
      toast.success(`Track "${name.trim()}" created in Salesforce`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create track');
    }
  };

  const canSubmit =
    !!name.trim() && !!picked && connected === true && !resolveError && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={isPicking ? 'sm:max-w-sm bottom-6 top-auto translate-y-0' : 'sm:max-w-lg'}
      >
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide">New Track</DialogTitle>
          <DialogDescription>
            {isPicking
              ? 'Pan and zoom the map so the crosshair sits on the track, then capture the location.'
              : 'Creates the venue record in Salesforce as the system of record.'}
          </DialogDescription>
        </DialogHeader>

        {isPicking ? (
          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" size="sm" onClick={stopPicking}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUseThisLocation} className="gap-2">
              <Crosshair className="h-4 w-4" />
              Use this location
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {connected === false && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span>
                  Salesforce is not connected. Connect it in Settings → Salesforce Integration
                  before creating tracks.
                </span>
              </div>
            )}
            {resolveError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                <span className="font-mono break-all">{resolveError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="track-name">Track name</Label>
              <Input
                id="track-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Utah Motorsports Campus"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              {picked ? (
                <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <span className="flex items-center gap-2 font-mono text-xs">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {formatCoordinates(picked.latitude, picked.longitude, picked.zoom)}
                  </span>
                  <Button variant="ghost" size="sm" onClick={startPicking}>
                    Re-pick
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={startPicking}>
                  <Crosshair className="h-4 w-4" />
                  Pick on map
                </Button>
              )}
            </div>

            {extraFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={`sf-${field.name}`}>
                  {field.label} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`sf-${field.name}`}
                  value={extraValues[field.name] ?? ''}
                  onChange={(e) =>
                    setExtraValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                  }
                  placeholder={field.name}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="track-description">Description (optional)</Label>
              <Textarea
                id="track-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}

        {!isPicking && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {(createMutation.isPending || resolving) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Track
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}