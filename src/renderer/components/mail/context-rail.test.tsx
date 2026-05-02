// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAssistantRuntimeConfig,
  createAttachmentCacheSummary,
  createDailyBrief,
  createDraftSummary,
  createPerformanceSummary
} from "@/test/mail-fixtures";
import { clickElement, findButton, renderReact } from "@/test/render";
import { ContextRail } from "./context-rail";

let view: ReturnType<typeof renderReact> | null = null;

afterEach(() => {
  view?.unmount();
  view = null;
});

describe("ContextRail", () => {
  it("switches between brief, system, and AI tab panels", async () => {
    view = renderReact(
      <ContextRail
        senderInsight={null}
        calendarContext={[]}
        snapshot={null}
        selectedThreadQueue={[]}
        actualOnline
        manualOffline={false}
        effectiveOnline
        lastQueueError={null}
        isRemoteSyncing={false}
        lastSyncedAt={null}
        syncTelemetry={null}
        draftSummary={createDraftSummary()}
        attachmentCacheSummary={createAttachmentCacheSummary()}
        performanceSummary={createPerformanceSummary()}
        dailyBrief={createDailyBrief()}
        runtimeCacheStatus="ready"
        runtimeCacheDetail="Runtime cache is ready."
        runtimeCacheItemCount={3}
        runtimeConfig={null}
        releaseDiagnostics={null}
        autoUpdateStatus={null}
        assistantConfig={createAssistantRuntimeConfig()}
        assistantError={null}
        threadSummary={null}
        threadSummaryGeneratedAt={null}
        splitSuggestion={null}
        splitSuggestionGeneratedAt={null}
        isSummarizingThread={false}
        isClassifyingThread={false}
        selectedThread={null}
        onToggleManualOffline={vi.fn()}
        onRefreshQueue={vi.fn(async () => {})}
        onCheckForUpdates={vi.fn(async () => {})}
        onDownloadUpdate={vi.fn(async () => {})}
        onInstallUpdate={vi.fn(async () => {})}
        onOpenLogsDirectory={vi.fn(async () => {})}
        onSaveAssistantSettings={vi.fn(async () => {})}
        onTestAssistantProviderConnection={vi.fn(async (provider, settings) => ({
          provider,
          ok: true,
          message: "ok",
          model: settings.providers[provider].model
        }))}
        onListOllamaModels={vi.fn(async () => ({
          baseUrl: "http://127.0.0.1:11434",
          models: []
        }))}
        onSummarizeThread={vi.fn(async () => {})}
        onSuggestThreadSplit={vi.fn(async () => {})}
        onApplySuggestedSplit={vi.fn(async () => {})}
        onApplyLocalRuleSplit={vi.fn(async () => {})}
      />
    );

    expect(view.container.textContent).toContain("Daily brief");
    expect(view.container.textContent).toContain("Inspector");
    expect(view.container.textContent).not.toContain("Offline cache");

    await clickElement(findButton(view.container, "System"));

    expect(view.container.textContent).toContain("Offline cache");
    expect(view.container.textContent).toContain("Runtime config");
    expect(view.container.textContent).not.toContain("AI providers");

    await clickElement(findButton(view.container, "AI"));

    expect(view.container.textContent).toContain("AI providers");
  });
});
