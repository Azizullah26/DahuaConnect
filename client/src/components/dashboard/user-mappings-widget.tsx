import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StatusIndicator from "@/components/common/status-indicator";
import { Link } from "wouter";

export default function UserMappingsWidget() {
  const { toast } = useToast();
  
  const { data: userMappings, isLoading } = useQuery({
    queryKey: ["/api/user-mappings"],
    refetchInterval: 60000,
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/user-mappings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-mappings"] });
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Users className="mr-2 text-primary" />
              User Mappings
            </CardTitle>
            <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
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

  const mappings = userMappings || [];

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Users className="mr-2 text-primary" />
            User Mappings
          </CardTitle>
          <Link href="/user-mappings">
            <Button size="sm" data-testid="button-add-user">
              <Plus className="w-4 h-4 mr-1" />
              Add User
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {mappings.length > 0 ? (
            mappings.slice(0, 3).map((mapping: any) => (
              <div key={mapping.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{mapping.email}</p>
                  <p className="text-xs text-muted-foreground">User ID: {mapping.dahuaUserId}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusIndicator status={mapping.isActive ? 'online' : 'offline'} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUserMutation.mutate(mapping.id)}
                    disabled={deleteUserMutation.isPending}
                    className="text-destructive hover:text-destructive/80 p-1"
                    data-testid={`button-remove-user-${mapping.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed border-border rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">No users mapped</p>
                <Link href="/user-mappings">
                  <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 mt-1">
                    Add your first user mapping
                  </Button>
                </Link>
              </div>
            </div>
          )}
          {mappings.length > 3 && (
            <Link href="/user-mappings">
              <Button variant="ghost" className="w-full text-sm text-primary hover:text-primary/80">
                View All Users ({mappings.length})
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
