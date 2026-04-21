import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { Badge } from "../ui/badge";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

interface ConnectAccountCardProps {
  isConnecting: boolean;
  error: string | null;
  onConnect: () => Promise<unknown>;
}

export function ConnectAccountCard({
  isConnecting,
  error,
  onConnect
}: ConnectAccountCardProps) {
  return (
    <>
      <CardHeader className="gap-4">
        <Badge className="w-fit border-accent/30 bg-accent/10 text-accent">
          Step 1 live
        </Badge>
        <div className="space-y-2">
          <CardTitle className="text-[28px]">
            Connect Gmail with a native desktop OAuth flow.
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">
            Tokens never enter the renderer. HyperMail uses a PKCE-based loopback flow
            in Electron, stores refresh tokens in the OS keychain, and keeps the UI lean
            enough to stay comfortably under the first interaction latency budget.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-3">
              <Mail className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Gmail scopes</p>
            </div>
            <p className="text-sm leading-6 text-muted">
              `gmail.modify`, `gmail.send`, `openid`, `email`, and `profile`. Enough for
              sync and drafting, without taking on broad account access.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <p className="text-sm font-medium text-foreground">Security posture</p>
            </div>
            <p className="text-sm leading-6 text-muted">
              Access tokens stay in Electron main. Refresh tokens are persisted through
              `keytar`, not plain local storage or the renderer process.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <Button
          size="lg"
          className="gap-2"
          disabled={isConnecting}
          onClick={() => void onConnect()}
        >
          {isConnecting ? "Connecting to Gmail..." : "Connect Gmail"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </>
  );
}
