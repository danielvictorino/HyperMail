import { useEffect, useRef } from "react";
import { MagnifyingGlassIcon, MagicWandIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { RankedCommand } from "@/lib/command-palette";

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
    <div className="fixed inset-0 z-50 bg-background/75 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="hm-command-surface relative mx-auto mt-[9vh] w-[min(704px,calc(100vw-2rem))] overflow-hidden">
        <div className="px-4 pb-4 pt-3">
          <div className="mb-3 inline-flex h-6 items-center rounded-md bg-white/[0.05] px-2 text-xs text-muted">
            HyperMail command line
          </div>
          <label className="flex min-h-[58px] items-center gap-3">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Type a command or search..."
              className="w-full border-none bg-transparent text-[18px] text-foreground outline-none placeholder:text-muted"
            />
          </label>
        </div>

        <div className="max-h-[280px] overflow-auto border-t border-white/[0.08]">
          {groupedCommands.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No matches</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Try a direct action like reply, archive, or go vip.
              </p>
            </div>
          ) : (
            groupedCommands.map((group) => (
              <div
                key={group.group}
                className="border-b border-white/[0.06] last:border-0"
              >
                <p className="px-4 py-2 text-[11px] font-medium text-muted">
                  {group.group}
                </p>
                <div>
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
                          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-all duration-150 ease-hyper",
                          active
                            ? "bg-white/[0.13] text-foreground"
                            : "bg-transparent text-muted hover:bg-white/[0.06] hover:text-foreground"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <MagicWandIcon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-foreground" : "text-muted"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-inherit">
                              {command.label}
                            </p>
                            {command.subtitle ? (
                              <p className="mt-0.5 truncate text-xs text-muted">
                                {command.subtitle}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {command.hint ? (
                          <span className="hm-kbd shrink-0">{command.hint}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
