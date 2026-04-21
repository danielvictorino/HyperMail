import type { ReactNode } from "react";
import { Clock3, Inbox, LogOut, Sparkles } from "lucide-react";
import type { AuthSessionSummary } from "@shared/contracts";
import { Badge } from "../ui/badge";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import { Button } from "../ui/button";

interface AccountProfileCardProps {
  session: AuthSessionSummary;
  isMutating: boolean;
  onDisconnect: () => Promise<unknown>;
}

export function AccountProfileCard({
  session,
  isMutating,
  onDisconnect
}: AccountProfileCardProps) {
  const connectedAt = new Date(session.connectedAt).toLocaleString();
  const messagesTotal =
    "messagesTotal" in session.account
      ? session.account.messagesTotal.toLocaleString()
      : "—";
  const threadsTotal =
    "threadsTotal" in session.account
      ? session.account.threadsTotal.toLocaleString()
      : "—";

  return (
    <>
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="w-fit border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
            {session.provider === "google" ? "Gmail connected" : "Microsoft connected"}
          </Badge>
          <Badge className="w-fit border-accent/30 bg-accent/10 text-accent">
            PKCE + secure keychain
          </Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-[28px]">
            {session.account.name ?? session.account.email}
          </CardTitle>
          <CardDescription className="text-base">
            {session.account.email}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-3">
          <MetricCard
            icon={<Inbox className="h-4 w-4 text-accent" />}
            label="Messages"
            value={messagesTotal}
          />
          <MetricCard
            icon={<Sparkles className="h-4 w-4 text-accent" />}
            label="Threads"
            value={threadsTotal}
          />
          <MetricCard
            icon={<Clock3 className="h-4 w-4 text-accent" />}
            label="Connected"
            value={connectedAt}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-foreground">Next in the pipeline</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Step 2 will introduce Dexie-backed local entities and a Modifier queue so
            archive, star, snooze, and send-later can all be instant locally and
            persisted asynchronously to Gmail.
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="gap-2"
          disabled={isMutating}
          onClick={() => void onDisconnect()}
        >
          <LogOut className="h-4 w-4" />
          Disconnect
        </Button>
      </CardContent>
    </>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
}

function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-3">
        {icon}
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <p className="text-[15px] leading-6 text-muted">{value}</p>
    </div>
  );
}
