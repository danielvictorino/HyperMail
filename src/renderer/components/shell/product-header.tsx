import { Command, Mail, Reply, Wifi, WifiOff } from "lucide-react";
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
  const PrimaryIcon = selectedThreadSubject ? Reply : Command;

  return (
    <header className="border-b border-white/10 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase text-muted">{workspaceLabel}</p>
            <Badge
              className={
                isDemo
                  ? "border-white/10 bg-white/[0.03] text-muted"
                  : "border-accent/25 bg-accent/10 text-accent"
              }
            >
              {providerLabel}
            </Badge>
          </div>
          <h1 className="mt-1 truncate text-[24px] font-semibold leading-tight text-foreground">
            {title}
          </h1>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="hm-section flex w-[280px] flex-none items-center gap-3 px-3 py-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
              <Mail className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {accountName}
              </p>
              <p className="truncate text-xs text-muted">{accountEmail}</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 xl:flex">
            <Badge className="border-white/10 bg-white/[0.03] text-muted">
              {syncBadgeLabel}
            </Badge>
            <Badge
              className={
                effectiveOnline
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-amber-400/20 bg-amber-400/10 text-amber-100"
              }
            >
              {effectiveOnline ? (
                <Wifi className="mr-1 h-3 w-3" />
              ) : (
                <WifiOff className="mr-1 h-3 w-3" />
              )}
              {effectiveOnline ? "Online" : "Offline"}
            </Badge>
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
            <Badge className="hidden border-white/10 bg-black/10 text-inherit xl:inline-flex">
              {selectedThreadSubject ? "R" : commandHint}
            </Badge>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden shrink-0 gap-2 border border-white/10 bg-white/[0.03] 2xl:inline-flex"
            onClick={onOpenPalette}
          >
            <Command className="h-4 w-4" />
            {commandHint}
          </Button>
        </div>
      </div>
    </header>
  );
}
