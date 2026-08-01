import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { NewTrackDialog } from '@/components/tracks/NewTrackDialog';

export function NewTrackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (user?.role !== 'wmc_admin') return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-primary/30 focus-visible:ring-primary/50"
            onClick={() => setOpen(true)}
            aria-label="New track"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">New track</TooltipContent>
      </Tooltip>
      <NewTrackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}