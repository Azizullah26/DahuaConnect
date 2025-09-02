import { Link, useLocation } from "wouter";
import { Shield, Activity, Users, DoorOpen, Settings, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusIndicator from "@/components/common/status-indicator";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { name: "Dashboard", href: "/", icon: Activity },
  { name: "Access Logs", href: "/access-logs", icon: Activity },
  { name: "User Mappings", href: "/user-mappings", icon: Users },
  { name: "Room Mappings", href: "/room-mappings", icon: DoorOpen },
  { name: "Configuration", href: "/configuration", icon: Settings },
  { name: "Test Endpoints", href: "/test-endpoints", icon: FlaskConical },
];

export default function Sidebar() {
  const [location] = useLocation();

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/system-health"],
    refetchInterval: 30000,
  });

  const getServiceStatus = (serviceName: string) => {
    if (!systemHealth || !Array.isArray(systemHealth)) return 'offline';
    const service = systemHealth.find((s: any) => s.service === serviceName);
    return service?.status || 'offline';
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="text-primary-foreground text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Access Control</h1>
            <p className="text-xs text-muted-foreground">Middleware Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Dahua Connection</span>
            <div className="flex items-center">
              <StatusIndicator status={getServiceStatus('dahua')} />
              <span className={cn(
                "text-xs",
                getServiceStatus('dahua') === 'online' ? "text-accent" : "text-destructive"
              )}>
                {getServiceStatus('dahua') === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Microsoft Graph</span>
            <div className="flex items-center">
              <StatusIndicator status={getServiceStatus('microsoft-graph')} />
              <span className={cn(
                "text-xs",
                getServiceStatus('microsoft-graph') === 'online' ? "text-accent" : "text-destructive"
              )}>
                {getServiceStatus('microsoft-graph') === 'online' ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Server Health</span>
            <div className="flex items-center">
              <StatusIndicator status={getServiceStatus('server')} />
              <span className={cn(
                "text-xs",
                getServiceStatus('server') === 'online' ? "text-accent" : "text-destructive"
              )}>
                {getServiceStatus('server') === 'online' ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
