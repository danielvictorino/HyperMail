import type { ReactNode } from "react";
import {
  ArchiveIcon,
  ClockIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  IdCardIcon,
  KeyboardIcon,
  LightningBoltIcon,
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

  return (
    <aside className="hm-density-compact flex h-auto min-h-0 flex-col p-3 lg:h-full">
      <div className="mb-4 flex items-center gap-3 px-1">
        <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-accent">
          <img
            src="./hypermail-mark.svg"
            alt=""
            className="h-5 w-5"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">
            HyperMail
          </p>
          <p className="truncate text-xs text-muted">Desktop alpha - v{appVersion}</p>
        </div>
      </div>

      <div className="hm-section mb-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {accountName}
            </p>
            <p className="mt-1 truncate text-xs text-muted">{accountEmail}</p>
          </div>
          <Badge
            className={
              connected
                ? "border-positive/25 bg-positive/10 text-positive"
                : "border-white/[0.1] bg-white/[0.035] text-muted"
            }
          >
            {connected ? providerLabel : "Demo"}
          </Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="hm-list-row px-2.5 py-2">
            <p className="text-muted">Mode</p>
            <p className="mt-1 font-medium text-foreground">
              {isDemo ? "Demo" : "Connected"}
            </p>
          </div>
          <div className="hm-list-row px-2.5 py-2">
            <p className="text-muted">Provider</p>
            <p className="mt-1 font-medium text-foreground">
              {connected ? providerLabel : "Local"}
            </p>
          </div>
        </div>

        <Button
          variant={connected ? "secondary" : "primary"}
          size="sm"
          className="mt-3 w-full"
          disabled={authBusy}
          onClick={() => void (connected ? onDisconnectGmail() : onConnectGmail())}
        >
          {connected ? `Disconnect ${providerLabel}` : "Connect Gmail"}
        </Button>
      </div>

      <div className="hm-list-surface overflow-auto p-1.5 lg:min-h-0 lg:flex-1">
        {navItems.map((item) => {
          const active = item.id === selectedSection;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-all duration-150 ease-hyper",
                active
                  ? "bg-white/[0.08] text-foreground shadow-[inset_2px_0_0_rgb(var(--hm-accent))]"
                  : "text-muted hover:bg-white/[0.045] hover:text-foreground"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={active ? "text-accent" : "text-muted"}>
                  {navIcons[item.id]}
                </span>
                <span className="truncate text-sm font-medium">{item.label}</span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.unreadCount > 0 ? (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {item.unreadCount}
                  </span>
                ) : null}
                <span className="text-xs">{item.count}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 hidden p-3 lg:block hm-section">
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <KeyboardIcon className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Command line</span>
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
          className="mt-3 w-full justify-between border border-white/[0.1] bg-white/[0.035]"
          onClick={onOpenPalette}
        >
          <span className="whitespace-nowrap">Palette</span>
          <Badge className="gap-1 border-white/[0.1] bg-white/[0.04]">
            <ViewGridIcon className="h-3 w-3" />
            {commandHint}
          </Badge>
        </Button>
      </div>
    </aside>
  );
}

function ShortcutRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="hm-list-row flex min-w-0 items-center justify-between gap-2 px-2 py-1.5">
      <span className="truncate text-[11px]">{label}</span>
      <span className="hm-kbd h-[18px] min-w-[18px] px-1.5 text-[10px]">{hint}</span>
    </div>
  );
}
