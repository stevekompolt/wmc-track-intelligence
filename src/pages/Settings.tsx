import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings as SettingsIcon, Database, Users, Key, Server } from 'lucide-react';

export default function Settings() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold tracking-wider flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-primary" />
            SYSTEM SETTINGS
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure system integrations and manage access
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-display">Salesforce Integration</CardTitle>
              </div>
              <CardDescription>SFDC endpoint configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="text-xs border-status-caution/50 text-status-caution">
                Mock Mode
              </Badge>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Configure SFDC endpoints for production
              </p>
            </CardContent>
          </Card>

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
