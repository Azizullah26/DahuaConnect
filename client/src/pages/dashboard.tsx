import Topbar from "@/components/layout/topbar";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RecentActivity from "@/components/dashboard/recent-activity";
import QuickActions from "@/components/dashboard/quick-actions";
import UserMappingsWidget from "@/components/dashboard/user-mappings-widget";
import RoomMappingsWidget from "@/components/dashboard/room-mappings-widget";
import TestInterface from "@/components/dashboard/test-interface";

export default function Dashboard() {
  return (
    <>
      <Topbar 
        title="Dashboard" 
        description="Monitor and manage access control system" 
      />
      
      <div className="flex-1 overflow-auto p-6">
        <MetricsCards />
        
        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RecentActivity />
          <QuickActions />
        </div>

        {/* System Configuration & Mappings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UserMappingsWidget />
          <RoomMappingsWidget />
        </div>

        <TestInterface />
      </div>
    </>
  );
}
