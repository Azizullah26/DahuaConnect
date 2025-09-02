import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Topbar from "@/components/layout/topbar";
import { Settings, Shield, Database, Network, Save, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Configuration() {
  const { toast } = useToast();
  const [showSecrets, setShowSecrets] = useState(false);
  
  // Dahua Configuration
  const [dahuaHost, setDahuaHost] = useState(process.env.DAHUA_HOST || "192.168.1.100");
  const [dahuaPort, setDahuaPort] = useState(process.env.DAHUA_PORT || "80");
  const [dahuaUser, setDahuaUser] = useState(process.env.DAHUA_USER || "admin");
  const [dahuaPass, setDahuaPass] = useState("••••••••");
  
  // Microsoft Graph Configuration
  const [azureClientId, setAzureClientId] = useState(process.env.AZURE_CLIENT_ID || "206217f2-eb5f-46f5-aa7e-f246c2a97ef5");
  const [azureTenantId, setAzureTenantId] = useState(process.env.AZURE_TENANT_ID || "14a72467-3f25-4572-a535-3d5eddb00cc5");
  const [azureClientSecret, setAzureClientSecret] = useState("••••••••••••••••••••••••••••••••");
  
  // System Settings
  const [autoCreateBookings, setAutoCreateBookings] = useState(false);
  const [accessWindow, setAccessWindow] = useState("15");
  const [debugLogging, setDebugLogging] = useState(true);

  const handleSaveConfiguration = () => {
    toast({
      title: "Configuration Saved",
      description: "System configuration has been updated successfully",
    });
  };

  const maskValue = (value: string, visible: boolean) => {
    if (visible) return value;
    return "•".repeat(value.length);
  };

  return (
    <>
      <Topbar 
        title="Configuration" 
        description="Manage system settings and credentials" 
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Dahua Device Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 text-primary" />
              Dahua Device Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dahua-host">Device Host/IP</Label>
                <Input
                  id="dahua-host"
                  value={dahuaHost}
                  onChange={(e) => setDahuaHost(e.target.value)}
                  placeholder="192.168.1.100"
                  data-testid="input-dahua-host"
                />
              </div>
              <div>
                <Label htmlFor="dahua-port">Port</Label>
                <Input
                  id="dahua-port"
                  value={dahuaPort}
                  onChange={(e) => setDahuaPort(e.target.value)}
                  placeholder="80"
                  data-testid="input-dahua-port"
                />
              </div>
              <div>
                <Label htmlFor="dahua-user">Username</Label>
                <Input
                  id="dahua-user"
                  value={dahuaUser}
                  onChange={(e) => setDahuaUser(e.target.value)}
                  placeholder="admin"
                  data-testid="input-dahua-user"
                />
              </div>
              <div>
                <Label htmlFor="dahua-pass">Password</Label>
                <div className="relative">
                  <Input
                    id="dahua-pass"
                    type={showSecrets ? "text" : "password"}
                    value={showSecrets ? "admin123" : dahuaPass}
                    onChange={(e) => setDahuaPass(e.target.value)}
                    placeholder="••••••••"
                    data-testid="input-dahua-pass"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowSecrets(!showSecrets)}
                    data-testid="button-toggle-secrets"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Microsoft Graph Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Network className="mr-2 text-primary" />
              Microsoft Graph Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="azure-client-id">Azure Client ID</Label>
                <Input
                  id="azure-client-id"
                  value={azureClientId}
                  onChange={(e) => setAzureClientId(e.target.value)}
                  placeholder="206217f2-eb5f-46f5-aa7e-f246c2a97ef5"
                  data-testid="input-azure-client-id"
                />
              </div>
              <div>
                <Label htmlFor="azure-tenant-id">Azure Tenant ID</Label>
                <Input
                  id="azure-tenant-id"
                  value={azureTenantId}
                  onChange={(e) => setAzureTenantId(e.target.value)}
                  placeholder="14a72467-3f25-4572-a535-3d5eddb00cc5"
                  data-testid="input-azure-tenant-id"
                />
              </div>
              <div>
                <Label htmlFor="azure-client-secret">Azure Client Secret</Label>
                <div className="relative">
                  <Input
                    id="azure-client-secret"
                    type={showSecrets ? "text" : "password"}
                    value={showSecrets ? "4pT8Q~zhZE_PFKf9nnZCrLNJqqZpYaotFqebTcPu" : azureClientSecret}
                    onChange={(e) => setAzureClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    data-testid="input-azure-client-secret"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 text-primary" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-create Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create reservations when no booking exists
                </p>
              </div>
              <Switch
                checked={autoCreateBookings}
                onCheckedChange={setAutoCreateBookings}
                data-testid="switch-auto-create-bookings"
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="access-window">Access Time Window (minutes)</Label>
              <p className="text-sm text-muted-foreground">
                How many minutes before/after a meeting to allow access
              </p>
              <Input
                id="access-window"
                type="number"
                value={accessWindow}
                onChange={(e) => setAccessWindow(e.target.value)}
                placeholder="15"
                className="w-32"
                data-testid="input-access-window"
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Debug Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Enable detailed logging for troubleshooting
                </p>
              </div>
              <Switch
                checked={debugLogging}
                onCheckedChange={setDebugLogging}
                data-testid="switch-debug-logging"
              />
            </div>
          </CardContent>
        </Card>

        {/* Environment Variables Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="mr-2 text-primary" />
              Environment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Node Environment</span>
                <Badge variant="outline">{process.env.NODE_ENV || 'development'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Server Port</span>
                <Badge variant="outline">{process.env.PORT || '5000'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Webhook Endpoint</span>
                <Badge variant="outline">/api/dahua-webhook</Badge>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Required Environment Variables</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground font-mono">
                <div>AZURE_CLIENT_ID</div>
                <div>AZURE_TENANT_ID</div>
                <div>AZURE_CLIENT_SECRET</div>
                <div>DAHUA_HOST</div>
                <div>DAHUA_PORT</div>
                <div>DAHUA_USER</div>
                <div>DAHUA_PASS</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Configuration */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveConfiguration}
            className="flex items-center space-x-2"
            data-testid="button-save-configuration"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>
    </>
  );
}
