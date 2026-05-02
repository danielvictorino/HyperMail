import type { ReactNode } from "react";
import {
  ArchiveIcon,
  ClockIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  IdCardIcon,
  LightningBoltIcon,
  MagnifyingGlassIcon,
  PaperPlaneIcon,
  StarIcon,
  ViewGridIcon
} from "@radix-ui/react-icons";
import type { MailboxNavItem } from "@/lib/mailbox-view";
import type { MailboxSectionId } from "@/state/inbox-ui-store";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

interface MailSidebarProps {
  accountEmail: string;
  accountName: string;
  appVersion: string;
  isDemo: boolean;
  connected: boolean;
  connectedProvider: "google" | "microsoft" | null;
  commandHint: string;
  onOpenPalette: () => void;
  navItems: MailboxNavItem[];
  selectedSection: MailboxSectionId;
  onSelectSection: (section: MailboxSectionId) => void;
  onConnectGmail: () => Promise<unknown>;
  onDisconnectGmail: () => Promise<unknown>;
  authBusy: boolean;
}

const navIcons: Record<MailboxSectionId, ReactNode> = {
  inbox: <EnvelopeClosedIcon className="h-4 w-4" />,
  important: <LightningBoltIcon className="h-4 w-4" />,
  vip: <IdCardIcon className="h-4 w-4" />,
  waiting: <PaperPlaneIcon className="h-4 w-4" />,
  other: <EnvelopeOpenIcon className="h-4 w-4" />,
  starred: <StarIcon className="h-4 w-4" />,
  snoozed: <ClockIcon className="h-4 w-4" />,
  archive: <ArchiveIcon className="h-4 w-4" />
};

export function MailSidebar({
  accountEmail,
  accountName,
  appVersion,
  isDemo,
  connected,
  connectedProvider,
  commandHint,
  onOpenPalette,
  navItems,
  selectedSection,
  onSelectSection,
  onConnectGmail,
  onDisconnectGmail,
  authBusy
}: MailSidebarProps) {
  const providerLabel = connectedProvider === "microsoft" ? "Microsoft" : "Gmail";
  const initials =
    accountName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "HM";

  return (
    <aside className="hm-density-compact flex h-auto min-h-0 flex-col gap-3 px-3 py-3 lg:h-full">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left transition-colors duration-150 hover:bg-[rgb(133_134_152/0.12)]"
          title={accountEmail}
        >
          <div className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded bg-accent text-foreground">
            <img
              src="./hypermail-mark.svg"
              alt=""
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-none text-foreground">
              HyperMail
            </p>
            <p className="mt-1 truncate text-[11px] leading-none text-muted">
              v{appVersion}
            </p>
          </div>
        </button>

        <div className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border border-[rgb(var(--hm-linear-border))] bg-[rgb(var(--hm-linear-control))] text-[10px] font-medium text-foreground">
          {initials}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_32px] gap-2">
        <Button
          variant={connected ? "secondary" : "primary"}
          size="sm"
          className="h-8 justify-start gap-2 rounded px-2 text-[13px]"
          disabled={authBusy}
          onClick={() => void (connected ? onDisconnectGmail() : onConnectGmail())}
        >
          <EnvelopeClosedIcon className="h-4 w-4" />
          <span className="truncate">
            {connected ? `Disconnect ${providerLabel}` : "Connect Gmail"}
          </span>
        </Button>
        <button
          type="button"
          aria-label="Open command palette"
          className="hm-linear-control grid h-8 w-8 place-items-center text-muted transition-colors duration-150 hover:text-foreground"
          onClick={onOpenPalette}
        >
          <MagnifyingGlassIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded border border-[rgb(var(--hm-linear-border))] bg-[rgb(var(--hm-linear-panel))] px-2 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium leading-none text-foreground">
              {accountName}
            </p>
            <p className="mt-1 truncate text-[11px] leading-none text-muted">
              {accountEmail}
            </p>
          </div>
          <Badge
            className={
              connected
                ? "border-positive/25 bg-positive/10 text-positive"
                : "border-[rgb(var(--hm-linear-border))] bg-transparent text-muted"
            }
          >
            {connected ? providerLabel : "Demo"}
          </Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="rounded border border-[rgb(var(--hm-linear-border))] px-2 py-1.5">
            <p className="text-muted">Mode</p>
            <p className="mt-1 truncate font-medium text-foreground">
              {isDemo ? "Demo" : "Connected"}
            </p>
          </div>
          <div className="rounded border border-[rgb(var(--hm-linear-border))] px-2 py-1.5">
            <p className="text-muted">Provider</p>
            <p className="mt-1 truncate font-medium text-foreground">
              {connected ? providerLabel : "Local"}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-auto lg:flex-1">
        {navItems.map((item) => {
          const active = item.id === selectedSection;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={cn(
                "hm-linear-menu-row flex w-full items-center justify-between gap-2 px-2 text-left text-[13px] transition-colors duration-150",
                active
                  ? "hm-linear-menu-row-active text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={active ? "text-accent" : "text-muted"}>
                  {navIcons[item.id]}
                </span>
                <span className="truncate font-medium">{item.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {item.unreadCount > 0 ? (
                  <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                    {item.unreadCount}
                  </span>
                ) : null}
                <span className="text-[11px]">{item.count}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:block">
        <div className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-medium text-muted">
          <ViewGridIcon className="h-3.5 w-3.5" />
          Command line
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs text-muted">
          <ShortcutRow label="Cmd" hint={commandHint} />
          <ShortcutRow label="Search" hint="/" />
          <ShortcutRow label="Reply" hint="R" />
          <ShortcutRow label="Brief" hint="A" />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-8 w-full justify-between rounded border border-[rgb(var(--hm-linear-border))] bg-transparent px-2"
          onClick={onOpenPalette}
        >
          <span className="whitespace-nowrap text-[13px]">Palette</span>
          <span className="hm-kbd">{commandHint}</span>
        </Button>
      </div>
    </aside>
  );
}

function ShortcutRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded border border-[rgb(var(--hm-linear-border))] px-2 py-1.5">
      <span className="truncate text-[11px]">{label}</span>
      <span className="hm-kbd h-[18px] min-w-[18px] px-1.5 text-[10px]">{hint}</span>
    </div>
  );
}
