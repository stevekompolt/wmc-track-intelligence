import { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { iconOptions, getViewpointIcon } from '@/lib/viewpointIcons';
import { useViewpointContext } from '@/contexts/ViewpointContext';
import type { CameraState, IconKey, AppMode } from '@/types/viewpoint';

interface SaveViewpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaveViewpointDialog({ open, onOpenChange }: SaveViewpointDialogProps) {
  const { captureCamera, saveViewpoint } = useViewpointContext();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [buttonIcon, setButtonIcon] = useState<IconKey>('camera');
  const [priority, setPriority] = useState(10);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [visibleToFans, setVisibleToFans] = useState(true);
  const [visibleToMedia, setVisibleToMedia] = useState(true);
  const [visibleToOps, setVisibleToOps] = useState(true);
  const [modes, setModes] = useState<AppMode[]>(['editor', 'ops', 'media', 'fan']);
  const [capturedCamera, setCapturedCamera] = useState<CameraState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Capture camera when dialog opens
  useEffect(() => {
    if (open) {
      const camera = captureCamera();
      setCapturedCamera(camera);
      // Reset form
      setName('');
      setDescription('');
      setButtonIcon('camera');
      setPriority(10);
      setStatus('published');
      setVisibleToFans(true);
      setVisibleToMedia(true);
      setVisibleToOps(true);
      setModes(['editor', 'ops', 'media', 'fan']);
    }
  }, [open, captureCamera]);
  
  const toggleMode = (mode: AppMode) => {
    setModes(prev => 
      prev.includes(mode) 
        ? prev.filter(m => m !== mode)
        : [...prev, mode]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedCamera || !name.trim() || modes.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await saveViewpoint({
        name: name.trim(),
        description: description.trim() || undefined,
        buttonIcon,
        priority,
        status,
        visibleToFans,
        visibleToMedia,
        visibleToOps,
        modes,
        camera: capturedCamera,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save viewpoint:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const SelectedIcon = getViewpointIcon(buttonIcon);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Camera className="h-5 w-5 text-primary" />
            Save Viewpoint
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Camera preview */}
          {capturedCamera && (
            <div className="p-3 bg-secondary/50 rounded-md font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lat/Lng:</span>
                <span>{capturedCamera.latitude.toFixed(4)}, {capturedCamera.longitude.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zoom:</span>
                <span>{capturedCamera.height.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heading:</span>
                <span>{capturedCamera.heading.toFixed(0)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pitch:</span>
                <span>{capturedCamera.pitch.toFixed(0)}°</span>
              </div>
            </div>
          )}
          
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Turn 1 Entry"
              required
            />
          </div>
          
          {/* Icon */}
          <div className="space-y-2">
            <Label>Button Icon</Label>
            <Select value={buttonIcon} onValueChange={v => setButtonIcon(v as IconKey)}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <SelectedIcon className="h-4 w-4" />
                    <span>{iconOptions.find(o => o.value === buttonIcon)?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map(option => {
                  const IconComp = getViewpointIcon(option.value);
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComp className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>
          
          {/* Modes */}
          <div className="space-y-2">
            <Label>Visible in Modes *</Label>
            <div className="flex flex-wrap gap-3">
              {(['editor', 'ops', 'media', 'fan'] as AppMode[]).map(mode => (
                <div key={mode} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`mode-${mode}`}
                    checked={modes.includes(mode)}
                    onCheckedChange={() => toggleMode(mode)}
                  />
                  <Label htmlFor={`mode-${mode}`} className="text-sm capitalize cursor-pointer">
                    {mode === 'fan' ? 'Fan Preview' : mode}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visible to</Label>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="vis-fans"
                  checked={visibleToFans}
                  onCheckedChange={c => setVisibleToFans(c === true)}
                />
                <Label htmlFor="vis-fans" className="text-sm cursor-pointer">Fans</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="vis-media"
                  checked={visibleToMedia}
                  onCheckedChange={c => setVisibleToMedia(c === true)}
                />
                <Label htmlFor="vis-media" className="text-sm cursor-pointer">Media</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="vis-ops"
                  checked={visibleToOps}
                  onCheckedChange={c => setVisibleToOps(c === true)}
                />
                <Label htmlFor="vis-ops" className="text-sm cursor-pointer">Ops</Label>
              </div>
            </div>
          </div>
          
          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={100}
                value={priority}
                onChange={e => setPriority(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <RadioGroup value={status} onValueChange={v => setStatus(v as 'draft' | 'published')}>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="draft" id="status-draft" />
                    <Label htmlFor="status-draft" className="text-sm cursor-pointer">Draft</Label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value="published" id="status-published" />
                    <Label htmlFor="status-published" className="text-sm cursor-pointer">Published</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || modes.length === 0 || !capturedCamera || isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Viewpoint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
