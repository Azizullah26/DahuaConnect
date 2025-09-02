import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Topbar from "@/components/layout/topbar";
import StatusIndicator from "@/components/common/status-indicator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRoomMappingSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const formSchema = insertRoomMappingSchema.extend({
  roomName: z.string().optional(),
});

export default function RoomMappings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: roomMappings, isLoading } = useQuery({
    queryKey: ["/api/room-mappings"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      doorChannel: 1,
      roomEmail: "",
      roomName: "",
      isActive: true,
    },
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => 
      apiRequest("POST", "/api/room-mappings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Room Added",
        description: "Room mapping created successfully"
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Failed to Add Room",
        description: "Unable to create room mapping",
        variant: "destructive"
      });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/room-mappings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createRoomMutation.mutate(data);
  };

  const getRandomStatus = (index: number) => {
    // Simulate different statuses for visual variety
    return index === 2 ? 'warning' : 'online';
  };

  return (
    <>
      <Topbar 
        title="Room Mappings" 
        description="Manage door channel to room email mappings" 
      />
      
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Room Mappings</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-room-mapping">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Room Mapping
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Room Mapping</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="doorChannel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Door Channel</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="1" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                data-testid="input-door-channel"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="roomEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Room5@elrace.com" {...field} data-testid="input-room-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="roomName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Room Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Conference Room 5" {...field} data-testid="input-room-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="submit" 
                          disabled={createRoomMutation.isPending}
                          data-testid="button-save-room"
                        >
                          {createRoomMutation.isPending ? "Adding..." : "Add Room"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel-room"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <div>
                        <div className="h-4 bg-muted rounded w-48 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-32"></div>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : roomMappings && roomMappings.length > 0 ? (
              <div className="space-y-4">
                {roomMappings.map((mapping: any, index: number) => (
                  <div key={mapping.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center space-x-3">
                      <StatusIndicator status={mapping.isActive ? getRandomStatus(index) : 'offline'} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {mapping.roomName || mapping.roomEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Door Channel: {mapping.doorChannel} • {mapping.roomEmail}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRoomMutation.mutate(mapping.id)}
                      disabled={deleteRoomMutation.isPending}
                      className="text-destructive hover:text-destructive/80"
                      data-testid={`button-delete-room-${mapping.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No room mappings configured</p>
                <p className="text-sm mt-2">Add your first room mapping to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
