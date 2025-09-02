import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import AccessLogs from "@/pages/access-logs";
import UserMappings from "@/pages/user-mappings";
import RoomMappings from "@/pages/room-mappings";
import Configuration from "@/pages/configuration";
import TestEndpoints from "@/pages/test-endpoints";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/access-logs" component={AccessLogs} />
          <Route path="/user-mappings" component={UserMappings} />
          <Route path="/room-mappings" component={RoomMappings} />
          <Route path="/configuration" component={Configuration} />
          <Route path="/test-endpoints" component={TestEndpoints} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div className="dark">
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
