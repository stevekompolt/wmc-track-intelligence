import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Database, Users, Key, Server, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_ACCESS } from '@/types/auth';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getSalesforceStatus, type ConnectedServiceStatus } from '@/services/salesforceAdminApi';

export default function Settings() {
  const { user } = useAuth();
  const roleConfig = user?.role ? ROLE_ACCESS[user.role] : null;
  const [sfStatus, setSfStatus] = useState<ConnectedServiceStatus | null>(null);

  useEffect(() => {
    getSalesforceStatus().then(setSfStatus);
  }, []);
  const sfConnected = sfStatus?.status === 'connected';

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold tracking-wider flex items-center gap-3">
              <SettingsIcon className="h-6 w-6 text-primary" />
              SYSTEM SETTINGS
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure system integrations and manage access
            </p>
          </div>
          {roleConfig && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-primary/30 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm text-primary">{roleConfig.label}</span>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/settings/salesforce" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg">
          <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-display">Salesforce Integration</CardTitle>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </div>
              <CardDescription>OAuth-connected Salesforce org (admin-managed)</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant="outline"
                className={`text-xs ${sfConnected ? 'border-emerald-500/50 text-emerald-400' : 'border-status-caution/50 text-status-caution'}`}
              >
                {sfConnected ? 'Connected' : 'Not connected'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 font-mono truncate">
                {sfConnected ? sfStatus?.org_name || sfStatus?.org_id : 'Click to manage connection'}
              </p>
            </CardContent>
          </Card>
          </Link>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-display">Mapbox</CardTitle>
              </div>
              <CardDescription>Map services configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs border-muted-foreground/50">
                Not Configured
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Add Mapbox access token
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-display">Data Source</CardTitle>
              </div>
              <CardDescription>Track and feature data origin</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs border-zone-track/50 text-zone-track">
                Local Mock Data
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Switch to SFDC when ready
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-display">User Management</CardTitle>
              </div>
              <CardDescription>Role and access configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs">
                SFDC Managed
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Roles synced from Salesforce
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
