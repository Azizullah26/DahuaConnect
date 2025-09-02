import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning';
  className?: string;
}

export default function StatusIndicator({ status, className }: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        "status-indicator",
        {
          "status-online": status === 'online',
          "status-offline": status === 'offline',
          "status-warning": status === 'warning',
        },
        className
      )}
    />
  );
}
