import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Topbar from "@/components/layout/topbar";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { FlaskConical, Globe, Calendar, Heart, DoorOpen, Network, Play, RefreshCw } from "lucide-react";

export default function TestEndpoints() {
  const { toast } = useToast();
  
  // Test states
  const [webhookUserId, setWebhookUserId] = useState("2689");
  const [webhookDoor, setWebhookDoor] = useState("1");
  const [webhookEventCode, setWebhookEventCode] = useState("FaceRecognition");
  
  const [calendarUserEmail, setCalendarUserEmail] = useState("aziz@elrace.com");
  const [calendarRoomEmail, setCalendarRoomEmail] = useState("Room1@elrace.com");
  
  const [doorChannel, setDoorChannel] = useState("1");
  const [doorAction, setDoorAction] = useState("open");
  
  const [advancedAction, setAdvancedAction] = useState("records");
  const [captureUserId, setCaptureUserId] = useState("2689");
  const [recognitionThreshold, setRecognitionThreshold] = useState("90");
  
  const [testResults, setTestResults] = useState<any>(null);

  const { data: roomMappings } = useQuery({
    queryKey: ["/api/room-mappings"]
  });

  const { data: userMappings } = useQuery({
    queryKey: ["/api/user-mappings"]
  });

  // Test webhook mutation
  const testWebhookMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/event", {
      code: webhookEventCode,
      action: "Start",
      index: parseInt(webhookDoor),
      data: { UserID: webhookUserId, Door: parseInt(webhookDoor) }
    }),
    onSuccess: async (response) => {
      const result = await response.json();
      setTestResults({ type: 'webhook', result });
      toast({
        title: "Webhook Test Complete",
        description: result.success ? "Event processed successfully" : "Event processing failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      setTestResults({ type: 'webhook', error: error.message });
      toast({
        title: "Webhook Test Failed",
        description: "Unable to send test event",
        variant: "destructive"
      });
    }
  });

  // Test calendar mutation
  const testCalendarMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/calendar", {
      userEmail: calendarUserEmail,
      roomEmail: calendarRoomEmail
    }),
    onSuccess: async (response) => {
      const result = await response.json();
      setTestResults({ type: 'calendar', result });
      toast({
        title: "Calendar Test Complete",
        description: result.success ? "Calendar check completed" : "Calendar check failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      setTestResults({ type: 'calendar', error: error.message });
      toast({
        title: "Calendar Test Failed",
        description: "Unable to test calendar integration",
        variant: "destructive"
      });
    }
  });

  // Test door control mutation
  const testDoorMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/door", {
      channel: parseInt(doorChannel),
      action: doorAction
    }),
    onSuccess: async (response) => {
      const result = await response.json();
      setTestResults({ type: 'door', result });
      toast({
        title: "Door Test Complete",
        description: result.success ? `Door ${doorAction} successful` : `Door ${doorAction} failed`,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      setTestResults({ type: 'door', error: error.message });
      toast({
        title: "Door Test Failed",
        description: "Unable to control door",
        variant: "destructive"
      });
    }
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/test/connection"),
    onSuccess: async (response) => {
      const result = await response.json();
      setTestResults({ type: 'connection', result });
      toast({
        title: "Connection Test Complete",
        description: result.success ? "All services connected" : "Some connections failed",
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      setTestResults({ type: 'connection', error: error.message });
      toast({
        title: "Connection Test Failed",
        description: "Unable to test connections",
        variant: "destructive"
      });
    }
  });

  // Test advanced Dahua features mutation
  const testAdvancedMutation = useMutation({
    mutationFn: () => {
      const payload: any = { action: advancedAction };
      if (advancedAction === 'capture') {
        payload.userId = captureUserId;
      } else if (advancedAction === 'threshold') {
        payload.threshold = parseInt(recognitionThreshold);
      }
      return apiRequest("POST", "/api/test/dahua-advanced", payload);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      setTestResults({ type: 'advanced', result });
      toast({
        title: "Advanced Test Complete",
        description: result.success ? `${advancedAction} operation successful` : `${advancedAction} operation failed`,
        variant: result.success ? "default" : "destructive"
      });
    },
    onError: (error) => {
      setTestResults({ type: 'advanced', error: error.message });
      toast({
        title: "Advanced Test Failed",
        description: "Unable to perform advanced operation",
        variant: "destructive"
      });
    }
  });

  const rooms = roomMappings || [];
  const users = userMappings || [];

  return (
    <>
      <Topbar 
        title="Test Endpoints" 
        description="Test and validate system functionality" 
      />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Webhook Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="mr-2 text-primary" />
                Test Webhook Event
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="webhook-event-code">Event Code</Label>
                <Select value={webhookEventCode} onValueChange={setWebhookEventCode}>
                  <SelectTrigger data-testid="select-webhook-event-code">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FaceRecognition">Face Recognition</SelectItem>
                    <SelectItem value="AccessControl">Access Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="webhook-user-id">User ID</Label>
                <Select value={webhookUserId} onValueChange={setWebhookUserId}>
                  <SelectTrigger data-testid="select-webhook-user-id">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.dahuaUserId}>
                        {user.dahuaUserId} - {user.email}
                      </SelectItem>
                    ))}
                    <SelectItem value="12345">12345 (Default)</SelectItem>
                    <SelectItem value="99999">99999 (Unmapped)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="webhook-door">Door/Channel</Label>
                <Select value={webhookDoor} onValueChange={setWebhookDoor}>
                  <SelectTrigger data-testid="select-webhook-door">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room: any) => (
                      <SelectItem key={room.id} value={room.doorChannel.toString()}>
                        {room.doorChannel} - {room.roomName || room.roomEmail}
                      </SelectItem>
                    ))}
                    <SelectItem value="1">1 (Default)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={() => testWebhookMutation.mutate()}
                disabled={testWebhookMutation.isPending}
                className="w-full"
                data-testid="button-test-webhook-event"
              >
                <Play className="w-4 h-4 mr-2" />
                {testWebhookMutation.isPending ? "Sending..." : "Send Webhook Event"}
              </Button>
            </CardContent>
          </Card>

          {/* Calendar Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 text-accent" />
                Test Calendar Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="calendar-user-email">User Email</Label>
                <Select value={calendarUserEmail} onValueChange={setCalendarUserEmail}>
                  <SelectTrigger data-testid="select-calendar-user-email">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.email}
                      </SelectItem>
                    ))}
                    <SelectItem value="aziz@elrace.com">aziz@elrace.com (Default)</SelectItem>
                    <SelectItem value="unknown@elrace.com">unknown@elrace.com (Test)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="calendar-room-email">Room Email</Label>
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
                data-testid="button-test-calendar-integration"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {testCalendarMutation.isPending ? "Testing..." : "Test Calendar"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Door Control & Connection Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Door Control Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DoorOpen className="mr-2 text-chart-2" />
                Test Door Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="door-channel">Door Channel</Label>
                <Select value={doorChannel} onValueChange={setDoorChannel}>
                  <SelectTrigger data-testid="select-door-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room: any) => (
                      <SelectItem key={room.id} value={room.doorChannel.toString()}>
                        {room.doorChannel} - {room.roomName || room.roomEmail}
                      </SelectItem>
                    ))}
                    <SelectItem value="1">Door 1</SelectItem>
                    <SelectItem value="2">Door 2</SelectItem>
                    <SelectItem value="3">Door 3</SelectItem>
                    <SelectItem value="4">Door 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="door-action">Action</Label>
                <Select value={doorAction} onValueChange={setDoorAction}>
                  <SelectTrigger data-testid="select-door-action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open Door</SelectItem>
                    <SelectItem value="close">Close Door</SelectItem>
                    <SelectItem value="status">Check Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={() => testDoorMutation.mutate()}
                disabled={testDoorMutation.isPending}
                className="w-full bg-chart-2 text-primary-foreground hover:bg-chart-2/90"
                data-testid="button-test-door-control"
              >
                <DoorOpen className="w-4 h-4 mr-2" />
                {testDoorMutation.isPending ? "Processing..." : `${doorAction.charAt(0).toUpperCase()}${doorAction.slice(1)} Door`}
              </Button>
            </CardContent>
          </Card>

          {/* Connection Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Network className="mr-2 text-chart-3" />
                Test All Connections
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dahua Device</span>
                  <Badge variant="outline">Ready to Test</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Microsoft Graph</span>
                  <Badge variant="outline">Ready to Test</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Server Health</span>
                  <Badge variant="outline">Ready to Test</Badge>
                </div>
              </div>
              
              <Separator />
              
              <Button
                onClick={() => testConnectionMutation.mutate()}
                disabled={testConnectionMutation.isPending}
                className="w-full bg-chart-3 text-primary-foreground hover:bg-chart-3/90"
                data-testid="button-test-all-connections"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {testConnectionMutation.isPending ? "Testing..." : "Test All Connections"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Dahua Operations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FlaskConical className="mr-2 text-chart-4" />
              Advanced Dahua Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="advanced-action">Operation</Label>
                  <Select value={advancedAction} onValueChange={setAdvancedAction}>
                    <SelectTrigger data-testid="select-advanced-action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="records">Get Unlock Records</SelectItem>
                      <SelectItem value="capture">Capture Face for User</SelectItem>
                      <SelectItem value="threshold">Set Recognition Threshold</SelectItem>
                      <SelectItem value="liveness">Enable Liveness Detection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {advancedAction === 'capture' && (
                  <div>
                    <Label htmlFor="capture-user-id">User ID for Face Capture</Label>
                    <Select value={captureUserId} onValueChange={setCaptureUserId}>
                      <SelectTrigger data-testid="select-capture-user-id">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user.id} value={user.dahuaUserId}>
                            {user.dahuaUserId} - {user.email}
                          </SelectItem>
                        ))}
                        <SelectItem value="12345">12345 (Default)</SelectItem>
                        <SelectItem value="2689">2689 (Example)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {advancedAction === 'threshold' && (
                  <div>
                    <Label htmlFor="recognition-threshold">Recognition Threshold (%)</Label>
                    <Input
                      id="recognition-threshold"
                      type="number"
                      min="1"
                      max="100"
                      value={recognitionThreshold}
                      onChange={(e) => setRecognitionThreshold(e.target.value)}
                      placeholder="90"
                      data-testid="input-recognition-threshold"
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="bg-secondary/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Operation Details</h4>
                  {advancedAction === 'records' && (
                    <p className="text-xs text-muted-foreground">Retrieves historical unlock/access records from the device for audit purposes.</p>
                  )}
                  {advancedAction === 'capture' && (
                    <p className="text-xs text-muted-foreground">Initiates face capture for a specific user to update their facial recognition profile.</p>
                  )}
                  {advancedAction === 'threshold' && (
                    <p className="text-xs text-muted-foreground">Sets the similarity threshold for face recognition matching (higher = more strict).</p>
                  )}
                  {advancedAction === 'liveness' && (
                    <p className="text-xs text-muted-foreground">Enables anti-spoofing detection to prevent photo/video attacks.</p>
                  )}
                </div>
                
                <Button
                  onClick={() => testAdvancedMutation.mutate()}
                  disabled={testAdvancedMutation.isPending}
                  className="w-full bg-chart-4 text-primary-foreground hover:bg-chart-4/90"
                  data-testid="button-test-advanced-operation"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {testAdvancedMutation.isPending ? "Processing..." : `Execute ${advancedAction.charAt(0).toUpperCase()}${advancedAction.slice(1)}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        {testResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FlaskConical className="mr-2 text-primary" />
                Test Results
                <Badge variant="outline" className="ml-2">
                  {testResults.type}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testResults.result && (
                  <div>
                    <Label className="text-sm font-medium">Response</Label>
                    <Textarea
                      value={JSON.stringify(testResults.result, null, 2)}
                      readOnly
                      rows={12}
                      className="font-mono text-xs mt-2"
                      data-testid="textarea-test-results"
                    />
                  </div>
                )}
                
                {testResults.error && (
                  <div>
                    <Label className="text-sm font-medium text-destructive">Error</Label>
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md mt-2">
                      <p className="text-sm text-destructive">{testResults.error}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setTestResults(null)}
                    data-testid="button-clear-results"
                  >
                    Clear Results
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(testResults, null, 2));
                      toast({ title: "Copied", description: "Results copied to clipboard" });
                    }}
                    data-testid="button-copy-results"
                  >
                    Copy to Clipboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* API Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Available API Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Webhook Endpoints</h4>
                  <div className="space-y-1 text-muted-foreground font-mono">
                    <div>POST /api/dahua-webhook</div>
                    <div>POST /api/test/event</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Calendar Endpoints</h4>
                  <div className="space-y-1 text-muted-foreground font-mono">
                    <div>POST /api/test/calendar</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Door Control</h4>
                  <div className="space-y-1 text-muted-foreground font-mono">
                    <div>POST /api/test/door</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">System Health</h4>
                  <div className="space-y-1 text-muted-foreground font-mono">
                    <div>GET /api/health</div>
                    <div>POST /api/test/connection</div>
                    <div>GET /api/system-health</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">User Management</h4>
                  <div className="space-y-1 text-muted-foreground font-mono">
                    <div>GET /api/user-mappings</div>
                    <div>POST /api/user-mappings</div>
                    <div>DELETE /api/user-mappings/:id</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Room Management</h4>
                  <div className="space-y-1 text-muted-foreground font-mono">
                    <div>GET /api/room-mappings</div>
                    <div>POST /api/room-mappings</div>
                    <div>DELETE /api/room-mappings/:id</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration Info */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Dahua Device Configuration</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure your Dahua device to send webhook events to this middleware:
                </p>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4">
                <Label className="text-xs font-medium">Webhook URL</Label>
                <div className="mt-1 p-2 bg-input rounded border font-mono text-xs">
                  http://your-server-ip:5000/api/dahua-webhook
                </div>
              </div>
              
              <div className="bg-secondary/50 rounded-lg p-4">
                <Label className="text-xs font-medium">Sample Webhook Payload</Label>
                <Textarea
                  value={JSON.stringify({
                    "AlarmType": "FaceRecognition",
                    "Action": "Start",
                    "ChannelID": 1,
                    "Data": {
                      "UserID": "12345",
                      "Door": 1
                    }
                  }, null, 2)}
                  readOnly
                  rows={8}
                  className="font-mono text-xs mt-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
