import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Topbar from "@/components/layout/topbar";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, X, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function AccessLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: accessLogs, isLoading } = useQuery({
    queryKey: ["/api/access-logs"],
    refetchInterval: 30000,
  });

  const filteredLogs = (accessLogs || []).filter((log: any) => {
    const matchesSearch = !searchTerm || 
      log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.roomEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.dahuaUserId?.includes(searchTerm);
    
    const matchesFilter = filterStatus === "all" || 
      (filterStatus === "granted" && log.accessGranted) ||
      (filterStatus === "denied" && !log.accessGranted);

    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <Topbar 
        title="Access Logs" 
        description="View and manage system access history" 
      />
      
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Access Events</CardTitle>
              <Button variant="outline" className="flex items-center space-x-2" data-testid="button-export-logs">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
            
            {/* Filters */}
            <div className="flex items-center space-x-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by user, room, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48" data-testid="select-filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="granted">Access Granted</SelectItem>
                  <SelectItem value="denied">Access Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                    <div className="h-4 bg-muted rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="space-y-4">
                {filteredLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-secondary/20 transition-colors">
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
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-foreground">
                          {log.userEmail || `User ID: ${log.dahuaUserId}`}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {log.eventType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {log.roomEmail ? log.roomEmail.split('@')[0] : `Door ${log.doorChannel}`} • 
                        {log.reason}
                      </p>
                    </div>
                    
                    <Badge 
                      variant={log.accessGranted ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {log.accessGranted ? 'Granted' : 'Denied'}
                    </Badge>
                    
                    <div className="text-right min-w-[120px]">
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, yyyy') : 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.timestamp ? format(new Date(log.timestamp), 'h:mm:ss a') : 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No access logs found</p>
                {searchTerm && (
                  <p className="text-sm mt-2">Try adjusting your search criteria</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
