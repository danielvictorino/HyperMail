import type { ComponentType } from "react";
import { GearIcon, MagicWandIcon, PersonIcon, ReaderIcon } from "@radix-ui/react-icons";
import {
  Bug,
  CalendarClock,
  Download,
  FolderOpen,
  HardDriveDownload,
  LoaderCircle,
  RefreshCcw,
  Send,
  Sparkles,
  UserRound,
  Wifi,
  WifiOff
} from "lucide-react";
import { useState } from "react";
import type {
  MailAssistantProvider,
  MailAssistantProviderConnectionResult,
  MailAssistantRuntimeConfig,
  MailSplitSuggestion,
  MailThreadSummary,
  MailAssistantSettingsInput,
  OllamaModelListResult
} from "@shared/ai/mail-assistant";
import type {
  AutoUpdateStatus,
  ReleaseDiagnosticsSummary,
  RuntimeConfigSummary
} from "@shared/contracts";
import type { InboxSnapshot, ThreadProjection } from "@shared/mail/models";
import type { GmailSyncTelemetry } from "@/offline/sync/gmail-sync";
import type { RuntimeCacheStatus } from "@/state/runtime-cache-store";
import type { CalendarContext, DailyBrief, SenderInsight } from "@/lib/mailbox-view";
import { cn } from "@/lib/utils";
import { AiSettingsPanel } from "./ai-settings-panel";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type RailTabId = "brief" | "intel" | "system" | "ai";

const railTabs: Array<{
  id: RailTabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { id: "brief", label: "Brief", icon: ReaderIcon },
  { id: "intel", label: "Intel", icon: PersonIcon },
  { id: "system", label: "System", icon: GearIcon },
  { id: "ai", label: "AI", icon: MagicWandIcon }
];

interface ContextRailProps {
  senderInsight: SenderInsight | null;
  calendarContext: CalendarContext[];
  snapshot: InboxSnapshot | null;
  selectedThreadQueue: InboxSnapshot["queue"];
  actualOnline: boolean;
  manualOffline: boolean;
  effectiveOnline: boolean;
  lastQueueError: string | null;
  isRemoteSyncing: boolean;
  lastSyncedAt: number | null;
  syncTelemetry: GmailSyncTelemetry | null;
  draftSummary: InboxSnapshot["draftSummary"];
  attachmentCacheSummary: InboxSnapshot["attachmentCacheSummary"];
  performanceSummary: InboxSnapshot["performance"];
  dailyBrief: DailyBrief;
  runtimeCacheStatus: RuntimeCacheStatus;
  runtimeCacheDetail: string;
  runtimeCacheItemCount: number;
  runtimeConfig: RuntimeConfigSummary | null;
  releaseDiagnostics: ReleaseDiagnosticsSummary | null;
  autoUpdateStatus: AutoUpdateStatus | null;
  assistantConfig: MailAssistantRuntimeConfig;
  assistantError: string | null;
  threadSummary: MailThreadSummary | null;
  threadSummaryGeneratedAt: number | null;
  splitSuggestion: MailSplitSuggestion | null;
  splitSuggestionGeneratedAt: number | null;
  isSummarizingThread: boolean;
  isClassifyingThread: boolean;
  selectedThread: ThreadProjection | null;
  onToggleManualOffline: () => void;
  onRefreshQueue: () => Promise<void>;
  onCheckForUpdates: () => Promise<unknown>;
  onDownloadUpdate: () => Promise<unknown>;
  onInstallUpdate: () => Promise<unknown>;
  onOpenLogsDirectory: () => Promise<unknown>;
  onSaveAssistantSettings: (settings: MailAssistantSettingsInput) => Promise<void>;
  onTestAssistantProviderConnection: (
    provider: MailAssistantProvider,
    settings: MailAssistantSettingsInput
  ) => Promise<MailAssistantProviderConnectionResult>;
  onListOllamaModels: (baseUrl?: string | null) => Promise<OllamaModelListResult>;
  onSummarizeThread: (thread?: ThreadProjection | null) => Promise<void>;
  onSuggestThreadSplit: (thread?: ThreadProjection | null) => Promise<void>;
  onApplySuggestedSplit: () => Promise<void>;
  onApplyLocalRuleSplit: () => Promise<void>;
}

export function ContextRail({
  senderInsight,
  calendarContext,
  snapshot,
  selectedThreadQueue,
  actualOnline,
  manualOffline,
  effectiveOnline,
  lastQueueError,
  isRemoteSyncing,
  lastSyncedAt,
  syncTelemetry,
  draftSummary,
  attachmentCacheSummary,
  performanceSummary,
  dailyBrief,
  runtimeCacheStatus,
  runtimeCacheDetail,
  runtimeCacheItemCount,
  runtimeConfig,
  releaseDiagnostics,
  autoUpdateStatus,
  assistantConfig,
  assistantError,
  threadSummary,
  threadSummaryGeneratedAt,
  splitSuggestion,
  splitSuggestionGeneratedAt,
  isSummarizingThread,
  isClassifyingThread,
  selectedThread,
  onToggleManualOffline,
  onRefreshQueue,
  onCheckForUpdates,
  onDownloadUpdate,
  onInstallUpdate,
  onOpenLogsDirectory,
  onSaveAssistantSettings,
  onTestAssistantProviderConnection,
  onListOllamaModels,
  onSummarizeThread,
  onSuggestThreadSplit,
  onApplySuggestedSplit,
  onApplyLocalRuleSplit
}: ContextRailProps) {
  const [activeTab, setActiveTab] = useState<RailTabId>("brief");
  const summary = snapshot?.queueSummary ?? {
    pending: 0,
    processing: 0,
    retry: 0,
    total: 0
  };

  return (
    <aside className="hm-density-compact flex h-full min-h-0 flex-col gap-3 break-words p-3">
      <div className="hm-section px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">Inspector</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Brief, intel, runtime, and AI.
            </p>
          </div>
          <Badge
            className={
              effectiveOnline
                ? "border-positive/25 bg-positive/10 text-positive"
                : "border-warning/25 bg-warning/10 text-warning"
            }
          >
            {effectiveOnline ? (
              <Wifi className="mr-1 h-3 w-3" />
            ) : (
              <WifiOff className="mr-1 h-3 w-3" />
            )}
            {effectiveOnline ? "Live" : "Offline"}
          </Badge>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Context rail views"
        className="hm-list-surface grid grid-cols-4 gap-1 p-1"
      >
        {railTabs.map((tab) => {
          const active = activeTab === tab.id;
          const TabIcon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn("hm-tab", active ? "hm-tab-active" : "")}
              onClick={() => setActiveTab(tab.id)}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-3">
          {activeTab === "system" ? (
            <>
              <div className="hm-rail-section">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Connection</p>
                  <Badge
                    className={
                      effectiveOnline
                        ? "border-positive/25 bg-positive/10 text-positive"
                        : "border-warning/25 bg-warning/10 text-warning"
                    }
                  >
                    {effectiveOnline ? (
                      <Wifi className="mr-1 h-3 w-3" />
                    ) : (
                      <WifiOff className="mr-1 h-3 w-3" />
                    )}
                    {effectiveOnline ? "Live" : "Offline"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-2">
                  <Metric label="Pending" value={String(summary.pending)} />
                  <Metric label="Processing" value={String(summary.processing)} />
                  <Metric label="Retry" value={String(summary.retry)} />
                </div>
                <div className="hm-inset-surface mt-4 rounded-lg px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted">Gmail sync</span>
                    <span className="font-medium text-foreground">
                      {isRemoteSyncing ? "Running" : "Idle"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    {lastSyncedAt
                      ? `Last sync ${new Date(lastSyncedAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit"
                        })}`
                      : "No Gmail sync recorded yet for this local mailbox."}
                  </p>
                  {syncTelemetry ? (
                    <p className="mt-2 text-xs leading-5 text-muted">
                      {syncTelemetry.mode} - {syncTelemetry.threadCount} threads -{" "}
                      {syncTelemetry.durationMs} ms
                      {syncTelemetry.recoveryReason === "history-gap"
                        ? " - recovered from history gap"
                        : ""}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="justify-between"
                    onClick={onToggleManualOffline}
                  >
                    <span>{manualOffline ? "Resume online" : "Simulate offline"}</span>
                    <span className="text-xs text-muted">
                      {actualOnline ? "network up" : "network down"}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-between border border-white/[0.1] bg-white/[0.035]"
                    onClick={() => void onRefreshQueue()}
                  >
                    <span>Sync now</span>
                    <RefreshCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <HardDriveDownload className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Offline cache</p>
                </div>
                <div className="space-y-2">
                  <Metric label="Asset cache" value={runtimeCacheStatus} />
                  <Metric label="Cached assets" value={String(runtimeCacheItemCount)} />
                  <Metric
                    label="Attachments"
                    value={String(attachmentCacheSummary.cachedItems)}
                  />
                  <Metric
                    label="Attachment bytes"
                    value={formatBytes(attachmentCacheSummary.cachedBytes)}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  {runtimeCacheDetail}
                </p>
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Runtime config</p>
                </div>
                {runtimeConfig ? (
                  <>
                    <div className="space-y-2">
                      <Metric
                        label="Mode"
                        value={runtimeConfig.packaged ? "packaged" : "development"}
                      />
                      <Metric
                        label="Gmail OAuth"
                        value={runtimeConfig.googleOAuthReady ? "ready" : "missing"}
                      />
                      <Metric
                        label="OpenAI"
                        value={runtimeConfig.openAiReady ? "ready" : "missing"}
                      />
                      <Metric
                        label="Anthropic"
                        value={runtimeConfig.anthropicReady ? "ready" : "missing"}
                      />
                      <Metric
                        label="Ollama"
                        value={runtimeConfig.ollamaReady ? "ready" : "missing"}
                      />
                      <Metric
                        label="Updates"
                        value={runtimeConfig.updatesUrlConfigured ? "ready" : "missing"}
                      />
                      <Metric
                        label="Crash upload"
                        value={
                          runtimeConfig.crashReportUploadConfigured
                            ? "ready"
                            : "local only"
                        }
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      {runtimeConfig.loadedConfigPath
                        ? `Loaded config from ${runtimeConfig.loadedConfigPath}.`
                        : `No config file loaded yet. Preferred path: ${runtimeConfig.preferredConfigPath}.`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-muted">
                    Runtime config details will appear once the shell context loads.
                  </p>
                )}
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <Bug className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Release ops</p>
                </div>
                {autoUpdateStatus ? (
                  <>
                    <div className="space-y-2">
                      <Metric
                        label="Updater"
                        value={formatUpdatePhase(autoUpdateStatus.phase)}
                      />
                      <Metric
                        label="Current build"
                        value={autoUpdateStatus.currentVersion}
                      />
                      <Metric
                        label="Available build"
                        value={autoUpdateStatus.availableVersion ?? "none"}
                      />
                      <Metric
                        label="Progress"
                        value={
                          autoUpdateStatus.progressPercent === null
                            ? "n/a"
                            : `${autoUpdateStatus.progressPercent.toFixed(0)}%`
                        }
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      {autoUpdateStatus.message ??
                        "Packaged update status will appear here once configured."}
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="justify-between"
                        disabled={!autoUpdateStatus.enabled}
                        onClick={() => void onCheckForUpdates()}
                      >
                        <span>Check for updates</span>
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-between border border-white/[0.1] bg-white/[0.035]"
                        disabled={autoUpdateStatus.phase !== "available"}
                        onClick={() => void onDownloadUpdate()}
                      >
                        <span>Download update</span>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-between border border-white/[0.1] bg-white/[0.035]"
                        disabled={autoUpdateStatus.phase !== "downloaded"}
                        onClick={() => void onInstallUpdate()}
                      >
                        <span>Restart to update</span>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-muted">
                    Packaged update controls will appear once the shell context loads.
                  </p>
                )}
                {releaseDiagnostics ? (
                  <>
                    <div className="mt-4 space-y-2">
                      <Metric
                        label="Crash reporter"
                        value={
                          releaseDiagnostics.crashReporterEnabled ? "armed" : "idle"
                        }
                      />
                      <Metric
                        label="Crash upload"
                        value={
                          releaseDiagnostics.crashReportUploadUrl ? "remote" : "local"
                        }
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted">
                      Logs: {releaseDiagnostics.logsDirectory}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Crashes: {releaseDiagnostics.crashDumpsDirectory}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full justify-between border border-white/[0.1] bg-white/[0.035]"
                      onClick={() => void onOpenLogsDirectory()}
                    >
                      <span>Open logs folder</span>
                      <FolderOpen className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">
                    Local performance
                  </p>
                </div>
                <div className="space-y-2">
                  <Metric
                    label="Snapshot load"
                    value={`${performanceSummary.snapshotLoadMs.toFixed(1)} ms`}
                  />
                  <Metric
                    label="Threads"
                    value={String(performanceSummary.threadCount)}
                  />
                  <Metric
                    label="Messages"
                    value={String(performanceSummary.messageCount)}
                  />
                  <Metric
                    label="Draft rows"
                    value={String(performanceSummary.draftCount)}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted">
                  Generated {formatRelativeTime(performanceSummary.generatedAt)} from
                  IndexedDB, before any network round-trip.
                </p>
              </div>
            </>
          ) : null}

          {activeTab === "brief" ? (
            <>
              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Daily brief</p>
                </div>
                <div className="space-y-2">
                  <Metric
                    label="Action needed"
                    value={String(dailyBrief.actionNeededCount)}
                  />
                  <Metric
                    label="Important unread"
                    value={String(dailyBrief.importantUnreadCount)}
                  />
                  <Metric label="Waiting" value={String(dailyBrief.waitingCount)} />
                  <Metric label="Drafts" value={String(dailyBrief.draftCount)} />
                  <Metric
                    label="Failed sends"
                    value={String(dailyBrief.failedSendCount)}
                  />
                </div>
                <div className="mt-4 rounded-lg border border-accent/20 bg-accent/10 px-3 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {dailyBrief.topActionLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {dailyBrief.topActionDetail}
                  </p>
                </div>
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Sender insight</p>
                </div>
                {senderInsight ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      {senderInsight.company}
                    </p>
                    <p className="text-sm leading-6 text-muted">
                      {senderInsight.strength}
                    </p>
                    <p className="text-sm leading-6 text-muted">
                      {senderInsight.relationship}
                    </p>
                    <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
                      {senderInsight.responseTimeLabel}
                    </Badge>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted">
                    Sender context appears once you select a thread.
                  </p>
                )}
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">
                    Calendar context
                  </p>
                </div>
                <div className="space-y-2">
                  {calendarContext.length === 0 ? (
                    <p className="text-sm leading-6 text-muted">
                      Calendar hints will appear for the selected thread.
                    </p>
                  ) : (
                    calendarContext.map((entry) => (
                      <div
                        key={`${entry.title}-${entry.timeLabel}`}
                        className="hm-inset-surface rounded-lg px-3 py-3"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {entry.title}
                        </p>
                        <p className="mt-1 text-xs uppercase text-accent">
                          {entry.timeLabel}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {entry.detail}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}

          {activeTab === "intel" ? (
            <>
              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">
                    Thread intelligence
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="hm-inset-surface rounded-lg px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Summary</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        disabled={
                          !selectedThread ||
                          !assistantConfig.enabled ||
                          isSummarizingThread
                        }
                        onClick={() => void onSummarizeThread(selectedThread)}
                      >
                        {isSummarizingThread ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "A"
                        )}
                      </Button>
                    </div>
                    {threadSummary ? (
                      <>
                        <p className="mt-2 text-sm leading-6 text-foreground">
                          {threadSummary.headline}
                        </p>
                        <div className="mt-3 space-y-2">
                          {threadSummary.bullets.map((bullet) => (
                            <p key={bullet} className="text-sm leading-6 text-muted">
                              {bullet}
                            </p>
                          ))}
                        </div>
                        {threadSummary.actionItems.length > 0 ? (
                          <div className="mt-3 rounded-lg border border-white/[0.1] bg-white/[0.035] px-3 py-2">
                            <p className="text-[11px] uppercase text-accent">
                              Action items
                            </p>
                            <div className="mt-2 space-y-1">
                              {threadSummary.actionItems.map((item) => (
                                <p key={item} className="text-sm leading-6 text-muted">
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs leading-5 text-muted">
                          {threadSummary.replyRecommendation}
                          {threadSummaryGeneratedAt
                            ? ` - ${formatRelativeTime(threadSummaryGeneratedAt)}`
                            : ""}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Summaries stay cached locally once generated for a thread.
                      </p>
                    )}
                  </div>

                  <div className="hm-inset-surface rounded-lg px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">
                        Split suggestion
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        disabled={
                          !selectedThread ||
                          !assistantConfig.enabled ||
                          isClassifyingThread
                        }
                        onClick={() => void onSuggestThreadSplit(selectedThread)}
                      >
                        {isClassifyingThread ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "L"
                        )}
                      </Button>
                    </div>
                    {splitSuggestion ? (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
                            {splitSuggestion.split}
                          </Badge>
                          <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
                            {splitSuggestion.confidence}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          {splitSuggestion.rationale}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          {splitSuggestion.triggerKeywords.join(" - ")}
                          {splitSuggestionGeneratedAt
                            ? ` - ${formatRelativeTime(splitSuggestionGeneratedAt)}`
                            : ""}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3 w-full justify-between"
                          onClick={() => void onApplySuggestedSplit()}
                        >
                          <span>Apply {splitSuggestion.split}</span>
                          <span className="text-xs text-muted">
                            {selectedThread?.thread.split === splitSuggestion.split
                              ? "already set"
                              : "update"}
                          </span>
                        </Button>
                      </>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Split suggestions help keep VIP, Important, and Other clean
                        without adding Gmail clutter.
                      </p>
                    )}
                    {selectedThread?.localRuleSplit &&
                    selectedThread.localRuleSplit !== selectedThread.thread.split ? (
                      <div className="mt-3 rounded-lg border border-white/[0.1] bg-white/[0.035] px-3 py-3">
                        <p className="text-[11px] uppercase text-accent">Local rule</p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {selectedThread.localRuleReason}
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="mt-3 w-full justify-between"
                          onClick={() => void onApplyLocalRuleSplit()}
                        >
                          <span>Apply {selectedThread.localRuleSplit}</span>
                          <span className="text-xs text-muted">manual</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="hm-rail-section">
                <div className="mb-3 flex items-center gap-2">
                  <Send className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium text-foreground">Thread queue</p>
                </div>
                <div className="mb-3 grid gap-2">
                  <Metric label="Drafts" value={String(draftSummary.draft)} />
                  <Metric label="Queued sends" value={String(draftSummary.queued)} />
                  <Metric label="Failed sends" value={String(draftSummary.failed)} />
                </div>
                <div className="space-y-2">
                  {selectedThreadQueue.length === 0 ? (
                    <p className="text-sm leading-6 text-muted">
                      No queued actions for the selected thread.
                    </p>
                  ) : (
                    selectedThreadQueue.map((record) => (
                      <div
                        key={record.id}
                        className="hm-inset-surface rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {record.type}
                          </span>
                          <Badge className="border-white/[0.1] bg-white/[0.035] text-muted">
                            {record.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-muted">
                          attempt {record.attempts + 1} - next{" "}
                          {new Date(record.nextAttemptAt).toLocaleTimeString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {lastQueueError ? (
                <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                  <div className="mb-2 flex items-center gap-2 text-red-50">
                    <Send className="h-4 w-4" />
                    <span>Queue / outbox error</span>
                  </div>
                  {lastQueueError}
                </div>
              ) : null}
            </>
          ) : null}

          {activeTab === "ai" ? (
            <AiSettingsPanel
              assistantConfig={assistantConfig}
              assistantError={assistantError}
              onSaveSettings={onSaveAssistantSettings}
              onTestProviderConnection={onTestAssistantProviderConnection}
              onListOllamaModels={onListOllamaModels}
            />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hm-list-row flex min-w-0 items-center justify-between gap-3 px-3 py-2 text-sm">
      <span className="min-w-0 text-muted">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

function formatRelativeTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatUpdatePhase(phase: AutoUpdateStatus["phase"]): string {
  switch (phase) {
    case "disabled":
      return "disabled";
    case "idle":
      return "ready";
    case "checking":
      return "checking";
    case "available":
      return "available";
    case "not-available":
      return "up to date";
    case "downloading":
      return "downloading";
    case "downloaded":
      return "ready to install";
    case "error":
      return "error";
    default:
      return phase;
  }
}
