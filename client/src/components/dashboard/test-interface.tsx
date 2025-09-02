import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Globe, Calendar, Heart } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TestInterface() {
  const { toast } = useToast();
  
  // Webhook test state
  const [webhookUserId, setWebhookUserId] = useState("12345");
  const [webhookDoor, setWebhookDoor] = useState("1");
  
  // Calendar test state
  const [calendarUserEmail, setCalendarUserEmail] = useState("aziz@elrace.com");
  const [calendarRoomEmail, setCalendarRoomEmail] = useState("Room1@elrace.com");

  const { data: roomMappings } = useQuery({
    queryKey: ["/api/room-mappings"]
  });

  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
  });

  const testWebhookMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/event", {
      code: "FaceRecognition",
      action: "Start",
      index: parseInt(webhookDoor),
      data: { UserID: webhookUserId, Door: parseInt(webhookDoor) }
    }),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Webhook Test",
        description: result.success ? "Event processed successfully" : "Event processing failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Webhook Test Failed",
        description: "Unable to send test event",
        variant: "destructive"
      });
    }
  });

  const testCalendarMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/calendar", {
      userEmail: calendarUserEmail,
      roomEmail: calendarRoomEmail
    }),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Calendar Test",
        description: result.success ? "Calendar check completed" : "Calendar check failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Calendar Test Failed",
        description: "Unable to test calendar integration",
        variant: "destructive"
      });
    }
  });

  const runHealthCheckMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/connection"),
    onSuccess: async (response) => {
      const result = await response.json();
      toast({
        title: "Health Check",
        description: result.success ? "All systems healthy" : "Some systems have issues",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: () => {
      toast({
        title: "Health Check Failed",
        description: "Unable to perform health check",
        variant: "destructive"
      });
    }
  });

  const rooms = roomMappings || [];

  return (
    <div className="mt-8">
      <div className="gradient-border">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <FlaskConical className="mr-2 text-primary" />
                Test Interface
              </CardTitle>
              <Badge variant="secondary" className="bg-accent/10 text-accent">
                Development Mode
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Test Webhook */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3 flex items-center">
                  <Globe className="mr-2 text-primary text-sm" />
                  Test Webhook
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="webhook-user-id" className="text-xs text-muted-foreground">
                      User ID
                    </Label>
                    <Input
                      id="webhook-user-id"
                      value={webhookUserId}
                      onChange={(e) => setWebhookUserId(e.target.value)}
                      className="text-sm"
                      data-testid="input-webhook-user-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-door" className="text-xs text-muted-foreground">
                      Door/Channel
                    </Label>
                    <Select value={webhookDoor} onValueChange={setWebhookDoor}>
                      <SelectTrigger data-testid="select-webhook-door">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room: any) => (
                          <SelectItem key={room.doorChannel} value={room.doorChannel.toString()}>
                            {room.doorChannel} - {room.roomName || room.roomEmail}
                          </SelectItem>
                        ))}
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => testWebhookMutation.mutate()}
                    disabled={testWebhookMutation.isPending}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-test-webhook"
                  >
                    {testWebhookMutation.isPending ? "Sending..." : "Send Test Event"}
                  </Button>
                </div>
              </div>

              {/* Test Calendar */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3 flex items-center">
                  <Calendar className="mr-2 text-accent text-sm" />
                  Test Calendar
                </h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="calendar-user-email" className="text-xs text-muted-foreground">
                      User Email
                    </Label>
                    <Input
                      id="calendar-user-email"
                      type="email"
                      value={calendarUserEmail}
                      onChange={(e) => setCalendarUserEmail(e.target.value)}
                      className="text-sm"
                      data-testid="input-calendar-user-email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="calendar-room-email" className="text-xs text-muted-foreground">
                      Room Email
                    </Label>
                    <Select value={calendarRoomEmail} onValueChange={setCalendarRoomEmail}>
                      <SelectTrigger data-testid="select-calendar-room-email">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map((room: any) => (
                          <SelectItem key={room.id} value={room.roomEmail}>
                            {room.roomName || room.roomEmail}
                          </SelectItem>
                        ))}
                        <SelectItem value="Room1@elrace.com">Room1@elrace.com</SelectItem>
                        <SelectItem value="Room2@elrace.com">Room2@elrace.com</SelectItem>
                        <SelectItem value="Room3@elrace.com">Room3@elrace.com</SelectItem>
                        <SelectItem value="Room4@elrace.com">Room4@elrace.com</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => testCalendarMutation.mutate()}
                    disabled={testCalendarMutation.isPending}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                    data-testid="button-test-calendar"
                  >
                    {testCalendarMutation.isPending ? "Testing..." : "Test Calendar"}
                  </Button>
                </div>
              </div>

              {/* Health Check */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3 flex items-center">
                  <Heart className="mr-2 text-chart-2 text-sm" />
                  Health Check
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Server Status</span>
                    <span className="text-xs text-accent">
                      {healthData?.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Last Check</span>
                    <span className="text-xs text-muted-foreground">
                      {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Environment</span>
                    <span className="text-xs text-muted-foreground">
                      {healthData?.environment?.node_env || 'Unknown'}
                    </span>
                  </div>
                  <Button
                    onClick={() => runHealthCheckMutation.mutate()}
                    disabled={runHealthCheckMutation.isPending}
                    className="w-full bg-chart-2 text-primary-foreground hover:bg-chart-2/90"
                    data-testid="button-run-health-check"
                  >
                    {runHealthCheckMutation.isPending ? "Checking..." : "Run Health Check"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
