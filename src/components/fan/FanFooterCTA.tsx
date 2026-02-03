import { Button } from '@/components/ui/button';
import { Ticket, Sparkles } from 'lucide-react';

export function FanFooterCTA() {
  return (
    <div className="pt-4 border-t border-border/50 space-y-3">
      {/* Primary CTA */}
      <Button
        className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-display"
        size="lg"
      >
        <Ticket className="h-4 w-4" />
        View Tickets
      </Button>
      
      {/* Secondary Link */}
      <button className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
        <Sparkles className="h-3 w-3" />
        <span>Explore VIP Experiences</span>
      </button>
    </div>
  );
}
