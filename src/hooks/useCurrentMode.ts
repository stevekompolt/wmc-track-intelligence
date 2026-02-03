import { useLocation } from 'react-router-dom';
import type { AppMode } from '@/types/viewpoint';

// Derive current app mode from router path
export function useCurrentMode(): AppMode {
  const location = useLocation();
  const path = location.pathname;
  
  if (path.startsWith('/editor')) return 'editor';
  if (path.startsWith('/ops')) return 'ops';
  if (path.startsWith('/media')) return 'media';
  if (path.startsWith('/fan')) return 'fan';
  
  // Default to editor for dashboard/root
  return 'editor';
}
