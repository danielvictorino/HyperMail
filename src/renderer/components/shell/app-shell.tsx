import type { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightRail: ReactNode;
}

export function AppShell({ sidebar, main, rightRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground lg:h-screen">
      <div className="hm-app-frame relative grid min-h-screen grid-cols-1 overflow-hidden lg:h-screen lg:min-h-0 lg:grid-cols-[220px_minmax(0,1fr)_320px] 2xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        <div className="hm-linear-sidebar min-h-0 border-b border-[rgb(var(--hm-linear-border))] lg:border-b-0">
          {sidebar}
        </div>
        <div className="hm-linear-content min-h-0 overflow-hidden">{main}</div>
        <div className="min-h-[360px] overflow-hidden border-t border-[rgb(var(--hm-linear-border))] bg-panel lg:min-h-0 lg:border-l lg:border-t-0">
          {rightRail}
        </div>
      </div>
    </div>
  );
}
