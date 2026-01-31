import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessView } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredView?: string;
}

export function ProtectedRoute({ children, requiredView }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">INITIALIZING SYSTEMS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if a specific view is required
  if (requiredView && !canAccessView(user?.role, requiredView)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
