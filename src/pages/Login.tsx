import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, LogIn, Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, isAuthenticated, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    // Clear error when user starts typing
    if (error && (email || password)) {
      clearError();
    }
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login({ email, password });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Racing stripe accent */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      
      {/* Background grid pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Logo/Brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-display font-bold tracking-wider text-foreground">
              WMC
            </h1>
          </div>
          <h2 className="text-xl font-display tracking-wide text-muted-foreground">
            TRACK INTELLIGENCE
          </h2>
          <p className="text-sm text-muted-foreground font-mono">
            CONTROL ROOM ACCESS
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-display">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@wmc.racing"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-input/50 border-border focus:border-primary"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-input/50 border-border focus:border-primary"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-display tracking-wider"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    AUTHENTICATING...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    ACCESS SYSTEM
                  </>
                )}
              </Button>
            </form>

            {/* Dev mode credentials hint */}
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground text-center font-mono mb-2">
                DEVELOPMENT MODE
              </p>
              <div className="text-xs text-muted-foreground/70 space-y-1 font-mono">
                <p>engineer@wmc.racing / demo123</p>
                <p>ops@wmc.racing / demo123</p>
                <p>media@wmc.racing / demo123</p>
                <p>admin@wmc.racing / demo123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground font-mono">
          WORLD MOTO CLASH © 2024 • SECURE ACCESS
        </p>
      </div>
    </div>
  );
}
