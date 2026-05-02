import type { ReactNode } from "react";
import { Card } from "../ui/card";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightRail: ReactNode;
}

export function AppShell({ sidebar, main, rightRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden p-3 lg:p-4">
      <div className="relative mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1880px] grid-cols-1 gap-3 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[272px_minmax(0,1fr)_344px]">
        <Card className="overflow-hidden shadow-shell">{sidebar}</Card>
        <Card className="overflow-hidden shadow-shell">{main}</Card>
        <Card className="overflow-hidden shadow-shell">{rightRail}</Card>
      </div>
    </div>
  );
}
