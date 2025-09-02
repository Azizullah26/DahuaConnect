import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function RecentActivity() {
  const { data: accessLogs, isLoading } = useQuery({
    queryKey: ["/api/access-logs"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center">
            <Clock className="mr-2 text-primary" />
            Recent Access Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 bg-secondary/50 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="text-right">
                  <div className="h-3 bg-muted rounded w-16 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentLogs = accessLogs?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center">
          <Clock className="mr-2 text-primary" />
          Recent Access Events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {recentLogs.length > 0 ? (
            recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center space-x-4 p-3 bg-secondary/50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  log.accessGranted ? 'bg-accent' : 'bg-destructive'
                }`}>
                  {log.accessGranted ? (
                    <Check className="text-accent-foreground text-sm" />
                  ) : (
                    <X className="text-destructive-foreground text-sm" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {log.userEmail || `User ID: ${log.dahuaUserId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {log.roomEmail ? log.roomEmail.split('@')[0] : `Door ${log.doorChannel}`} • {log.eventType}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    {log.timestamp ? format(new Date(log.timestamp), 'h:mm a') : 'Unknown'}
                  </p>
                  <Badge 
                    variant={log.accessGranted ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {log.accessGranted ? 'Granted' : 'Denied'}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No recent access events</p>
            </div>
          )}
        </div>
        <Link href="/access-logs">
          <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary/80">
            View All Events →
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
