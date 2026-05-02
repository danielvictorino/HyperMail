import type { ReactNode } from "react";
import {
  Command,
  Inbox,
  Mail,
  Send,
  Sparkles,
  Star,
  Archive,
  ShieldCheck,
  Clock3
} from "lucide-react";
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
  inbox: <Inbox className="h-4 w-4" />,
  important: <Sparkles className="h-4 w-4" />,
  vip: <ShieldCheck className="h-4 w-4" />,
  waiting: <Send className="h-4 w-4" />,
  other: <Mail className="h-4 w-4" />,
  starred: <Star className="h-4 w-4" />,
  snoozed: <Clock3 className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />
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
    <aside className="hm-density-compact flex h-full flex-col p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-accent/25 bg-accent/10 text-accent">
            <img
              src="/hypermail-mark.svg"
              alt=""
              className="h-6 w-6"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">HyperMail</p>
            <p className="text-sm text-muted">Desktop alpha · v{appVersion}</p>
          </div>
        </div>

        <div className="hm-section p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{accountName}</p>
              <p className="mt-1 text-xs text-muted">{accountEmail}</p>
            </div>
            <Badge
              className={
                connected
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.03] text-muted"
              }
            >
              {connected ? providerLabel : "Demo"}
            </Badge>
          </div>

          <p className="mt-3 text-sm leading-6 text-muted">
            {isDemo
              ? "A seeded mailbox keeps the UI and queue runtime fully explorable before network sync arrives."
              : "The local-first UI is now running on top of a connected account boundary."}
          </p>

          <Button
            variant={connected ? "secondary" : "primary"}
            size="sm"
            className="mt-4 w-full"
            disabled={authBusy}
            onClick={() => void (connected ? onDisconnectGmail() : onConnectGmail())}
          >
            {connected ? `Disconnect ${providerLabel}` : "Connect Gmail"}
          </Button>
        </div>

        <div className="hm-list-surface p-2">
          {navItems.map((item) => {
            const active = item.id === selectedSection;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-150 ease-hyper",
                  active
                    ? "bg-accent/12 text-foreground"
                    : "text-muted hover:bg-white/[0.04] hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={active ? "text-accent" : "text-muted"}>
                    {navIcons[item.id]}
                  </span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.unreadCount > 0 ? (
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent">
                      {item.unreadCount}
                    </span>
                  ) : null}
                  <span className="text-xs">{item.count}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="hm-section p-4">
          <div className="mb-3 flex items-center gap-2 text-foreground">
            <Command className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Keyboard-first shell</span>
          </div>
          <div className="space-y-2 text-sm text-muted">
            <ShortcutRow label="Command palette" hint={commandHint} />
            <ShortcutRow label="Search" hint="/" />
            <ShortcutRow label="Reply" hint="R" />
            <ShortcutRow label="Voice draft" hint="D" />
            <ShortcutRow label="Summarize" hint="A" />
            <ShortcutRow label="Waiting" hint="4" />
            <ShortcutRow label="Snooze" hint="Z" />
            <ShortcutRow label="Unsubscribe" hint="U" />
            <ShortcutRow label="Archive" hint="E" />
            <ShortcutRow label="Label split" hint="L" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-4 w-full justify-between border border-white/10 bg-white/[0.03]"
            onClick={onOpenPalette}
          >
            <span>Open palette</span>
            <Badge>{commandHint}</Badge>
          </Button>
        </div>
      </div>
    </aside>
  );
}

function ShortcutRow({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="hm-list-row flex items-center justify-between px-3 py-2">
      <span>{label}</span>
      <Badge className="border-white/10 bg-white/[0.03] text-muted">{hint}</Badge>
    </div>
  );
}
