import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Network, Play, UserPlus, FileText, ChevronRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function QuickActions() {
  const { toast } = useToast();

  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/connection"),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Connection Test",
        description: result.success ? "All systems connected successfully" : "Some connections failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Connection Test Failed",
        description: "Unable to test system connections",
        variant: "destructive"
      });
    }
  });

  const simulateEventMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/event", {
      code: "FaceRecognition",
      action: "Start",
      index: 1,
      data: { UserID: "12345", Door: 1 }
    }),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Event Simulation",
        description: result.success ? "Face recognition event simulated successfully" : "Event simulation failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Simulation Failed",
        description: "Unable to simulate face recognition event",
        variant: "destructive"
      });
    }
  });

  const actions = [
    {
      title: "Test System Connection",
      description: "Verify all services are operational",
      icon: Network,
      color: "bg-primary text-primary-foreground hover:bg-primary/90",
      onClick: () => testConnectionMutation.mutate(),
      loading: testConnectionMutation.isPending,
      testId: "action-test-connection"
    },
    {
      title: "Simulate Face Recognition",
      description: "Test webhook with sample data",
      icon: Play,
      color: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      onClick: () => simulateEventMutation.mutate(),
      loading: simulateEventMutation.isPending,
      testId: "action-simulate-event"
    },
    {
      title: "Add User Mapping",
      description: "Map new Dahua user to email",
      icon: UserPlus,
      color: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      href: "/user-mappings",
      testId: "action-add-user"
    },
    {
      title: "Export Access Logs",
      description: "Download activity reports",
      icon: FileText,
      color: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      href: "/access-logs",
      testId: "action-export-logs"
    }
  ];

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center">
          <Zap className="mr-2 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          if (action.href) {
            return (
              <Link key={index} href={action.href}>
                <Button 
                  className={`w-full flex items-center justify-between p-4 h-auto ${action.color}`}
                  data-testid={action.testId}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-medium">{action.title}</div>
                      <div className="text-sm opacity-80">{action.description}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            );
          }

          return (
            <Button
              key={index}
              className={`w-full flex items-center justify-between p-4 h-auto ${action.color}`}
              onClick={action.onClick}
              disabled={action.loading}
              data-testid={action.testId}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm opacity-80">{action.description}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" />
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
