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
    <header className="hm-linear-topbar flex items-center gap-3 px-3 py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          className="hm-linear-control flex max-w-[220px] items-center gap-2 px-2 py-1.5 text-left"
          title={workspaceLabel}
        >
          <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded bg-accent text-[10px] font-medium text-foreground">
            HM
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium leading-none text-foreground">
              {title}
            </span>
            <span className="mt-1 block truncate text-[11px] leading-none text-muted">
              {workspaceLabel}
            </span>
          </span>
        </button>

        <Badge
          className={
            isDemo
              ? "hidden border-[rgb(var(--hm-linear-border))] bg-transparent text-muted sm:inline-flex"
              : "hidden border-accent/30 bg-accent/10 text-foreground sm:inline-flex"
          }
        >
          {providerLabel}
        </Badge>

        <button
          type="button"
          onClick={onOpenPalette}
          className="hm-linear-control hidden h-8 min-w-[220px] flex-1 items-center justify-between gap-3 px-2.5 text-left transition-colors duration-150 hover:bg-[rgb(var(--hm-linear-surface))] lg:flex xl:max-w-[520px]"
          aria-label="Open command palette"
        >
          <span className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
            <KeyboardIcon className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate">Type a command or search...</span>
          </span>
          <span className="hm-kbd">{commandHint}</span>
        </button>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <div className="hidden items-center gap-1.5 xl:flex">
          <Badge className="border-[rgb(var(--hm-linear-border))] bg-transparent text-muted">
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

        <div className="hidden min-w-0 items-center gap-2 px-2 py-1 2xl:flex">
          <div className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded border border-[rgb(var(--hm-linear-border))] text-muted">
            <EnvelopeClosedIcon className="h-3 w-3" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium leading-none text-foreground">
              {accountName}
            </p>
            <p className="mt-1 truncate text-[11px] leading-none text-muted">
              {accountEmail}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant={selectedThreadSubject ? "primary" : "secondary"}
          size="sm"
          className="h-8 shrink-0 gap-2 rounded"
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
          className="h-8 shrink-0 gap-2 rounded border border-[rgb(var(--hm-linear-border))] bg-[rgb(var(--hm-linear-control))] lg:hidden"
          onClick={onOpenPalette}
        >
          <KeyboardIcon className="h-4 w-4" />
          <span className="sr-only">Open command palette</span>
        </Button>
      </div>
    </header>
  );
}
