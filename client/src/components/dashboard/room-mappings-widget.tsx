import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DoorOpen, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusIndicator from "@/components/common/status-indicator";
import { Link } from "wouter";

export default function RoomMappingsWidget() {
  const { toast } = useToast();
  
  const { data: roomMappings, isLoading } = useQuery({
    queryKey: ["/api/room-mappings"],
    refetchInterval: 60000,
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/room-mappings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-mappings"] });
      toast({
        title: "Room Removed",
        description: "Room mapping deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Unable to delete room mapping",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <DoorOpen className="mr-2 text-primary" />
              Room Mappings
            </CardTitle>
            <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg animate-pulse">
                <div>
                  <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-muted rounded-full"></div>
                  <div className="w-4 h-4 bg-muted rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const mappings = roomMappings || [];
  const getRandomStatus = (index: number) => {
    // Simulate different statuses for visual variety
    return index === 2 ? 'warning' : 'online';
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <DoorOpen className="mr-2 text-primary" />
            Room Mappings
          </CardTitle>
          <Link href="/room-mappings">
            <Button size="sm" data-testid="button-add-room">
              <Plus className="w-4 h-4 mr-1" />
              Add Room
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {mappings.length > 0 ? (
            mappings.map((mapping: any, index: number) => (
              <div key={mapping.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {mapping.roomName || mapping.roomEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">Door/Channel: {mapping.doorChannel}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator status={mapping.isActive ? getRandomStatus(index) : 'offline'} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRoomMutation.mutate(mapping.id)}
                    disabled={deleteRoomMutation.isPending}
                    className="text-destructive hover:text-destructive/80 p-1"
                    data-testid={`button-remove-room-${mapping.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No rooms mapped</p>
                <Link href="/room-mappings">
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 mt-1">
                    Add your first room mapping
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
