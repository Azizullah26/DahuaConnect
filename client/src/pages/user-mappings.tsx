import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Topbar from "@/components/layout/topbar";
import StatusIndicator from "@/components/common/status-indicator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserMappingSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const formSchema = insertUserMappingSchema.extend({
  name: z.string().optional(),
});

export default function UserMappings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: userMappings, isLoading } = useQuery({
    queryKey: ["/api/user-mappings"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dahuaUserId: "",
      email: "",
      name: "",
      isActive: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => 
      apiRequest("POST", "/api/user-mappings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "User Added",
        description: "User mapping created successfully"
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Failed to Add User",
        description: "Unable to create user mapping",
        variant: "destructive"
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user-mappings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "User Removed",
        description: "User mapping deleted successfully"
      });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Unable to delete user mapping",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createUserMutation.mutate(data);
  };

  return (
    <>
      <Topbar 
        title="User Mappings" 
        description="Manage Dahua user ID to email mappings" 
      />
      
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Mappings</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-user-mapping">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User Mapping
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add User Mapping</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="dahuaUserId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dahua User ID</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} data-testid="input-dahua-user-id" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="user@elrace.com" {...field} data-testid="input-user-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} data-testid="input-user-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="submit" 
                          disabled={createUserMutation.isPending}
                          data-testid="button-save-user"
                        >
                          {createUserMutation.isPending ? "Adding..." : "Add User"}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          data-testid="button-cancel-user"
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
                {Array.from({ length: 5 }).map((_, i) => (
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
            ) : userMappings && userMappings.length > 0 ? (
              <div className="space-y-4">
                {userMappings.map((mapping: any) => (
                  <div key={mapping.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center space-x-3">
                      <StatusIndicator status={mapping.isActive ? 'online' : 'offline'} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{mapping.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Dahua User ID: {mapping.dahuaUserId}
                          {mapping.name && ` • ${mapping.name}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteUserMutation.mutate(mapping.id)}
                      disabled={deleteUserMutation.isPending}
                      className="text-destructive hover:text-destructive/80"
                      data-testid={`button-delete-user-${mapping.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No user mappings configured</p>
                <p className="text-sm mt-2">Add your first user mapping to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
