import {
  ChatBubbleIcon,
  CircleBackslashIcon,
  EnvelopeClosedIcon,
  GlobeIcon,
  KeyboardIcon
} from "@radix-ui/react-icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface ProductHeaderProps {
  accountEmail: string;
  accountName: string;
  connectedProvider: "google" | "microsoft" | null;
  isDemo: boolean;
  title: string;
  workspaceLabel: string;
  syncBadgeLabel: string;
  effectiveOnline: boolean;
  commandHint: string;
  selectedThreadSubject: string | null;
  composerOpen: boolean;
  onOpenPalette: () => void;
  onPrimaryAction: () => void;
}

export function ProductHeader({
  accountEmail,
  accountName,
  connectedProvider,
  isDemo,
  title,
  workspaceLabel,
  syncBadgeLabel,
  effectiveOnline,
  commandHint,
  selectedThreadSubject,
  composerOpen,
  onOpenPalette,
  onPrimaryAction
}: ProductHeaderProps) {
  const providerLabel =
    connectedProvider === "microsoft"
      ? "Microsoft"
      : connectedProvider === "google"
        ? "Gmail"
        : "Demo";
  const primaryLabel = selectedThreadSubject
    ? composerOpen
      ? "Composer open"
      : "Reply"
    : "Command";
  const PrimaryIcon = selectedThreadSubject ? ChatBubbleIcon : KeyboardIcon;

  return (
    <header className="border-b border-white/[0.08] bg-panel-strong/55 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[190px] flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[11px] font-medium text-muted">
              {workspaceLabel}
            </p>
            <Badge
              className={
                isDemo
                  ? "border-white/[0.1] bg-white/[0.035] text-muted"
                  : "border-accent/25 bg-accent/10 text-foreground"
              }
            >
              {providerLabel}
            </Badge>
          </div>
          <h1 className="mt-1 truncate text-[17px] font-semibold leading-6 text-foreground">
            {title}
          </h1>
        </div>

        <button
          type="button"
          onClick={onOpenPalette}
          className="hm-input-shell hidden h-9 min-w-[260px] flex-1 items-center justify-between gap-3 px-3 text-left transition-colors duration-150 hover:border-white/[0.16] hover:bg-foreground/[0.06] lg:flex xl:max-w-[520px]"
          aria-label="Open command palette"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
            <KeyboardIcon className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">Type a command or search...</span>
          </span>
          <span className="hm-kbd">{commandHint}</span>
        </button>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <div className="hidden items-center gap-2 xl:flex">
            <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
              {syncBadgeLabel}
            </Badge>
            <Badge
              className={
                effectiveOnline
                  ? "border-positive/25 bg-positive/10 text-positive"
                  : "border-warning/25 bg-warning/10 text-warning"
              }
            >
              {effectiveOnline ? (
                <GlobeIcon className="mr-1 h-3 w-3" />
              ) : (
                <CircleBackslashIcon className="mr-1 h-3 w-3" />
              )}
              {effectiveOnline ? "Online" : "Offline"}
            </Badge>
          </div>

          <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 2xl:flex">
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-accent/25 bg-accent/10 text-accent">
              <EnvelopeClosedIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {accountName}
              </p>
              <p className="truncate text-[11px] text-muted">{accountEmail}</p>
            </div>
          </div>

          <Button
            type="button"
            variant={selectedThreadSubject ? "primary" : "secondary"}
            size="sm"
            className="shrink-0 gap-2"
            onClick={onPrimaryAction}
            disabled={Boolean(selectedThreadSubject && composerOpen)}
            aria-label={
              selectedThreadSubject
                ? `${primaryLabel}: ${selectedThreadSubject}`
                : "Open command palette"
            }
          >
            <PrimaryIcon className="h-4 w-4" />
            <span>{primaryLabel}</span>
            <span className="hm-kbd hidden text-inherit xl:inline-flex">
              {selectedThreadSubject ? "R" : commandHint}
            </span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-2 border border-white/[0.1] bg-white/[0.035] lg:hidden"
            onClick={onOpenPalette}
          >
            <KeyboardIcon className="h-4 w-4" />
            <span className="sr-only">Open command palette</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
