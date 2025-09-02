import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

interface TopbarProps {
  title: string;
  description: string;
}

export default function Topbar({ title, description }: TopbarProps) {
  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-accent rounded-full pulse-animation"></div>
            <span className="text-sm text-muted-foreground">Live Monitoring</span>
          </div>
          <Button
            onClick={handleRefresh}
            className="flex items-center space-x-2"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
