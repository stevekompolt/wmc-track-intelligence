import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Crown, User } from 'lucide-react';

interface ExperienceTogglesProps {
  experienceMode: 'day' | 'night';
  vipEmphasis: boolean;
  onModeChange: (mode: 'day' | 'night') => void;
  onVipChange: (vip: boolean) => void;
}

export function ExperienceToggles({
  experienceMode,
  vipEmphasis,
  onModeChange,
  onVipChange,
}: ExperienceTogglesProps) {
  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-border/50">
      {/* Day/Night Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {experienceMode === 'day' ? (
            <Sun className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Label htmlFor="day-night" className="text-xs text-muted-foreground">
            {experienceMode === 'day' ? 'Day Mode' : 'Night Mode'}
          </Label>
        </div>
        <Switch
          id="day-night"
          checked={experienceMode === 'night'}
          onCheckedChange={(checked) => onModeChange(checked ? 'night' : 'day')}
          className="scale-75"
        />
      </div>
      
      {/* VIP Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {vipEmphasis ? (
            <Crown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Label htmlFor="vip-mode" className="text-xs text-muted-foreground">
            {vipEmphasis ? 'VIP View' : 'Standard View'}
          </Label>
        </div>
        <Switch
          id="vip-mode"
          checked={vipEmphasis}
          onCheckedChange={onVipChange}
          className="scale-75"
        />
      </div>
    </div>
  );
}
