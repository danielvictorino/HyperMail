import type { ReactNode } from "react";
import { Card } from "../ui/card";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightRail: ReactNode;
}

export function AppShell({ sidebar, main, rightRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[32rem] w-[32rem] rounded-full bg-accent/8 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-6%] h-[26rem] w-[26rem] rounded-full bg-sky-400/6 blur-3xl" />
      </div>
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1880px] grid-cols-1 gap-4 lg:grid-cols-[272px_minmax(0,1fr)_344px]">
        <Card className="overflow-hidden shadow-shell">{sidebar}</Card>
        <Card className="overflow-hidden shadow-shell">{main}</Card>
        <Card className="overflow-hidden shadow-shell">{rightRail}</Card>
      </div>
    </div>
  );
}
