import type { ReactNode } from "react";

interface AppShellProps {
  sidebar: ReactNode;
  main: ReactNode;
  rightRail: ReactNode;
}

export function AppShell({ sidebar, main, rightRail }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden p-2 text-foreground lg:h-screen lg:p-3">
      <div className="hm-app-frame relative mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1920px] grid-cols-1 overflow-hidden lg:h-[calc(100vh-1.5rem)] lg:min-h-0 lg:grid-cols-[232px_minmax(0,1fr)_minmax(292px,308px)] xl:grid-cols-[244px_minmax(0,1fr)_324px] 2xl:grid-cols-[248px_minmax(0,1fr)_336px]">
        <div className="min-h-0 border-b border-white/[0.08] bg-panel/70 lg:border-b-0 lg:border-r">
          {sidebar}
        </div>
        <div className="min-h-0 overflow-hidden bg-panel-strong/45">{main}</div>
        <div className="min-h-[360px] overflow-hidden border-t border-white/[0.08] bg-panel/72 lg:min-h-0 lg:border-l lg:border-t-0">
          {rightRail}
        </div>
      </div>
    </div>
  );
}
