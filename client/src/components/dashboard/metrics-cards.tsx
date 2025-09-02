import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, DoorOpen, Ban, Building } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function MetricsCards() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="card-hover">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Today's Access Attempts",
      value: metrics?.totalAttempts || 0,
      subtitle: `${metrics?.totalAttempts > 0 ? '+' : ''}${metrics?.totalAttempts || 0} from yesterday`,
      icon: UserCheck,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Successful Access",
      value: metrics?.successfulAccess || 0,
      subtitle: `${metrics?.successRate || 0}% success rate`,
      icon: DoorOpen,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Denied Access",
      value: metrics?.deniedAccess || 0,
      subtitle: "No valid booking",
      icon: Ban,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Active Rooms",
      value: metrics?.activeRooms || 0,
      subtitle: `of ${metrics?.totalRooms || 0} monitored`,
      icon: Building,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="card-hover" data-testid={`metric-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  <p className={`text-sm ${card.color}`}>{card.subtitle}</p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${card.color} text-xl`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
