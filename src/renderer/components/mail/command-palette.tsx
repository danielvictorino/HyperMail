import { useEffect, useRef } from "react";
import { EnterIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { RankedCommand } from "@/lib/command-palette";
import { Badge } from "../ui/badge";

interface CommandPaletteProps {
  open: boolean;
  query: string;
  activeIndex: number;
  groupedCommands: Array<{ group: string; items: RankedCommand[] }>;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onHoverIndex: (index: number) => void;
  onExecuteIndex: (index: number) => Promise<void>;
}

export function CommandPalette({
  open,
  query,
  activeIndex,
  groupedCommands,
  onClose,
  onQueryChange,
  onHoverIndex,
  onExecuteIndex
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-[10vh] w-[min(780px,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-white/10 bg-panel-strong/95 shadow-shell">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <MagnifyingGlassIcon className="h-4 w-4 text-accent" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search actions, sections, threads..."
            className="w-full border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted"
          />
          <Badge className="gap-1 border-white/10 bg-white/[0.03] text-muted">
            <EnterIcon className="h-3 w-3" />
            Enter
          </Badge>
        </div>

        <div className="max-h-[70vh] overflow-auto px-2 py-2">
          {groupedCommands.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No matches</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Try a direct action like `reply`, `archive`, or `go vip`.
              </p>
            </div>
          ) : (
            groupedCommands.map((group) => (
              <div key={group.group} className="mb-3 last:mb-0">
                <p className="px-3 py-2 text-[11px] uppercase text-muted">
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.items.map((command) => {
                    const itemIndex = flatIndex++;
                    const active = itemIndex === activeIndex;

                    return (
                      <button
                        key={command.id}
                        type="button"
                        onMouseEnter={() => onHoverIndex(itemIndex)}
                        onClick={() => void onExecuteIndex(itemIndex)}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150 ease-hyper",
                          active
                            ? "bg-accent/12 text-foreground"
                            : "bg-transparent text-muted hover:bg-white/[0.04] hover:text-foreground"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-inherit">
                            {command.label}
                          </p>
                          {command.subtitle ? (
                            <p className="mt-1 truncate text-sm text-muted">
                              {command.subtitle}
                            </p>
                          ) : null}
                        </div>
                        {command.hint ? (
                          <Badge className="border-white/10 bg-black/10 text-muted">
                            {command.hint}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-muted">
          <span>Natural language: `draft maya`, `summarize launch`, `label vip`</span>
          <span>↑↓ move · Enter run · Esc close</span>
        </div>
      </div>
    </div>
  );
}
