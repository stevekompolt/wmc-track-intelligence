import { useIsMobile } from '@/hooks/use-mobile';
import { FanPreviewPanel } from '@/components/fan/FanPreviewPanel';
import { FanPreviewDrawer } from '@/components/fan/FanPreviewDrawer';

export default function FanExperience() {
  const isMobile = useIsMobile();

  return (
    <div className="relative h-full pointer-events-none">
      {isMobile ? <FanPreviewDrawer /> : <FanPreviewPanel />}
    </div>
  );
}
