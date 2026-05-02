// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAssistantRuntimeConfig,
  createAttachmentCacheSummary,
  createDailyBrief,
  createDraftSummary,
  createPerformanceSummary
} from "@/test/mail-fixtures";
import { clickElement, renderReact } from "@/test/render";
import { ContextRail } from "./context-rail";

let view: ReturnType<typeof renderReact> | null = null;

afterEach(() => {
  view?.unmount();
  view = null;
});

describe("ContextRail", () => {
  it("keeps release, cache, and AI controls behind the disclosure", async () => {
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
    expect(view.container.textContent).toContain("System, cache, and AI settings");

    const disclosure = view.container.querySelector("details");
    const summary = disclosure?.querySelector("summary");

    expect(disclosure).toBeInstanceOf(HTMLDetailsElement);
    expect(summary).toBeInstanceOf(HTMLElement);
    expect((disclosure as HTMLDetailsElement).open).toBe(false);

    await clickElement(summary as HTMLElement);

    expect((disclosure as HTMLDetailsElement).open).toBe(true);
    expect(view.container.textContent).toContain("Offline cache");
    expect(view.container.textContent).toContain("AI providers");
  });
});
