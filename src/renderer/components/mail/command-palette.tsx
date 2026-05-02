import { useEffect, useMemo, useRef } from "react";
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
  const flatCommands = useMemo(
    () => groupedCommands.flatMap((group) => group.items),
    [groupedCommands]
  );
  const activeCommand = flatCommands[activeIndex] ?? null;

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
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="hm-command-surface relative mx-auto mt-[9vh] w-[min(640px,calc(100vw-2rem))] overflow-hidden">
        <div className="flex flex-col items-start">
          <div className="w-full px-4 pt-4">
            <div className="inline-flex max-w-full items-center rounded bg-[rgb(124_124_164/0.13)] px-2 py-1 text-[12px] text-[rgb(220_216_254/0.56)]">
              <span className="truncate">
                {activeCommand?.subtitle || "HyperMail triage"}
              </span>
            </div>
          </div>

          <label className="flex min-h-[62px] w-full items-center gap-3 border-b border-[rgb(82_82_111/0.25)] px-5">
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Type a command or search..."
              className="w-full border-none bg-transparent text-[15px] leading-[22px] text-foreground outline-none placeholder:text-[#4d4f69]"
            />
          </label>
        </div>

        <div className="max-h-[320px] overflow-auto px-1.5 py-1">
          {groupedCommands.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No matches</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Try a direct action like reply, archive, or go vip.
              </p>
            </div>
          ) : (
            groupedCommands.map((group, groupIndex) => (
              <div key={group.group}>
                {groupIndex > 0 ? (
                  <div className="relative flex h-[11px] items-center">
                    <div className="absolute left-1 right-1 h-px bg-[rgb(82_82_111/0.25)]" />
                  </div>
                ) : null}
                <p className="px-3 py-2 text-[12px] font-medium text-[rgb(220_216_254/0.56)]">
                  {group.group}
                </p>
                {group.items.map((command) => {
                  const itemIndex = flatIndex++;
                  const active = itemIndex === activeIndex;

                  return (
                    <button
                      key={command.id}
                      type="button"
                      aria-selected={active}
                      onMouseEnter={() => onHoverIndex(itemIndex)}
                      onClick={() => void onExecuteIndex(itemIndex)}
                      className={cn(
                        "flex min-h-[40px] w-full items-center justify-between gap-4 rounded-md px-3.5 py-2.5 text-left transition-colors duration-150",
                        active
                          ? "bg-[rgb(133_134_152/0.16)] text-foreground"
                          : "text-muted hover:bg-[rgb(133_134_152/0.1)] hover:text-foreground"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-4">
                        <MagicWandIcon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-foreground" : "text-muted"
                          )}
                        />
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[13px] text-inherit">
                            {command.label}
                          </span>
                          {command.subtitle ? (
                            <span className="hidden truncate text-[13px] text-[rgb(220_216_254/0.56)] sm:inline">
                              {command.subtitle}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {command.hint ? (
                        <span className="hm-kbd shrink-0">{command.hint}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
