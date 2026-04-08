import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessView, ROLE_ACCESS } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Map, Radio, Camera, Users, ArrowRight, Shield } from 'lucide-react';

const viewCards = [
  {
    id: 'editor',
    title: 'Track Editor',
    description: 'Create and edit race track geometry, safety zones, and feature configurations.',
    icon: Map,
    path: '/editor',
    view: 'editor',
    color: 'text-zone-track',
  },
  {
    id: 'ops',
    title: 'Event Operations',
    description: 'Real-time race control room view with live status indicators and incident management.',
    icon: Radio,
    path: '/ops',
    view: 'ops',
    color: 'text-status-caution',
  },
  {
    id: 'media',
    title: 'Media Intelligence',
    description: 'Broadcast planning with camera positions, drone corridors, and coverage analysis.',
    icon: Camera,
    path: '/media',
    view: 'media',
    color: 'text-zone-media',
  },
  {
    id: 'fan',
    title: 'Fan Experience',
    description: 'Preview public-facing track views and validate spectator zone configurations.',
    icon: Users,
    path: '/fan',
    view: 'fan',
    color: 'text-zone-fan',
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const roleConfig = user?.role ? ROLE_ACCESS[user.role] : null;

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="font-display text-3xl font-bold tracking-wider">
              CONTROL CENTER
            </h1>
          </div>
          <p className="text-muted-foreground">
            Welcome back, <span className="text-foreground font-medium">{user?.name}</span>
          </p>
          {roleConfig && (
            <Badge variant="outline" className="border-primary/30 text-primary font-mono">
              {roleConfig.label} • {roleConfig.description}
            </Badge>
          )}
        </div>

        {/* View Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {viewCards.map((card) => {
            const isAccessible = canAccessView(user?.role, card.view);
            const Icon = card.icon;

            return isAccessible ? (
                <Link key={card.id} to={card.path} className="block">
                  <Card className="relative overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-md bg-secondary ${card.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <CardTitle className="font-display text-lg tracking-wide">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        Open View <ArrowRight className="h-4 w-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card key={card.id} className="relative overflow-hidden opacity-50 cursor-not-allowed">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-md bg-secondary ${card.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary" className="text-xs">No Access</Badge>
                    </div>
                    <CardTitle className="font-display text-lg tracking-wide">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground font-mono">Contact admin for access</p>
                  </CardContent>
                </Card>
              );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="text-2xl font-display font-bold">3</div>
              <div className="text-xs text-muted-foreground">Active Tracks</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="text-2xl font-display font-bold text-status-clear">0</div>
              <div className="text-xs text-muted-foreground">Active Incidents</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="text-2xl font-display font-bold">12</div>
              <div className="text-xs text-muted-foreground">Camera Positions</div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="text-2xl font-display font-bold">—</div>
              <div className="text-xs text-muted-foreground">Next Event</div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-clear animate-pulse" />
                  <span className="text-muted-foreground">Database</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-clear animate-pulse" />
                  <span className="text-muted-foreground">Map Services</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-status-caution" />
                  <span className="text-muted-foreground">SFDC Sync</span>
                  <Badge variant="outline" className="text-xs">Mock Mode</Badge>
                </div>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Last sync: —
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
