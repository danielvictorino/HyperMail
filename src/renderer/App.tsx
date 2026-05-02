import { AppShell } from "./components/shell/app-shell";
import { CommandPalette } from "./components/mail/command-palette";
import { ContextRail } from "./components/mail/context-rail";
import { MailSidebar } from "./components/mail/mail-sidebar";
import { ThreadView } from "./components/mail/thread-view";
import { VirtualThreadList } from "./components/mail/virtual-thread-list";
import { useAuthSession } from "./hooks/use-auth-session";
import { useCommandPalette } from "./hooks/use-command-palette";
import { useKeyboardEngine } from "./hooks/use-keyboard-engine";
import { useMailboxLab } from "./hooks/use-mailbox-lab";
import { ProductHeader } from "./components/shell/product-header";
import { isMacLike } from "./lib/utils";
import { useRuntimeCacheStore } from "./state/runtime-cache-store";

export default function App() {
  const auth = useAuthSession();
  const mailbox = useMailboxLab(auth.session);
  const runtimeCacheStatus = useRuntimeCacheStore((state) => state.status);
  const runtimeCacheDetail = useRuntimeCacheStore((state) => state.detail);
  const runtimeCacheItemCount = useRuntimeCacheStore((state) => state.itemCount);
  const commandHint = isMacLike(auth.platform) ? "Cmd+K" : "Ctrl+K";
  const connectedProvider = auth.session?.provider ?? null;
  const syncBadgeLabel = mailbox.isDemo
    ? "Demo mailbox"
    : auth.session?.provider === "microsoft"
      ? "Microsoft auth ready"
      : mailbox.isRemoteSyncing
        ? "Syncing Gmail"
        : mailbox.lastSyncedAt
          ? `Synced ${new Date(mailbox.lastSyncedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit"
            })}`
          : "Awaiting Gmail sync";
  const workspaceLabel = mailbox.isDemo
    ? "Offline-first demo"
    : auth.session?.provider === "microsoft"
      ? "Microsoft workspace"
      : "Gmail workspace";
  const headerTitle = mailbox.isSearching
    ? "Search cached mail"
    : `${mailbox.sectionLabel} triage`;
  const commandPalette = useCommandPalette({
    authSession: auth.session,
    connectGmail: auth.connectGoogle,
    disconnectGmail: auth.disconnectGoogle,
    mailbox
  });

  useKeyboardEngine({
    commandPaletteOpen: commandPalette.open,
    openCommandPalette: () => commandPalette.openPalette(),
    closeCommandPalette: commandPalette.closePalette,
    commandPaletteMove: commandPalette.moveActiveIndex,
    commandPaletteCount: commandPalette.rankedCommands.length,
    executeActiveCommand: () =>
      commandPalette.executeCommand(commandPalette.activeCommand),
    selectedThread: mailbox.selectedThread,
    selectedSection: mailbox.selectedSection,
    selectNextThread: mailbox.selectNextThread,
    selectPreviousThread: mailbox.selectPreviousThread,
    setSelectedSection: mailbox.setSelectedSection,
    searchQuery: mailbox.searchQuery,
    clearSearchQuery: mailbox.clearSearchQuery,
    requestSearchFocus: mailbox.requestSearchFocus,
    openComposer: mailbox.openComposer,
    closeComposer: mailbox.closeComposer,
    composerOpen: mailbox.composerOpen,
    toggleStar: mailbox.toggleStar,
    toggleArchive: mailbox.toggleArchive,
    snoozeThread: mailbox.snoozeThread,
    unsnoozeThread: mailbox.unsnoozeThread,
    unsubscribeThread: mailbox.unsubscribeThread,
    summarizeThread: mailbox.generateThreadSummary,
    generateVoiceDraft: mailbox.generateVoiceDraft,
    suggestThreadSplit: mailbox.suggestThreadSplit
  });

  return (
    <>
      <AppShell
        sidebar={
          <MailSidebar
            accountEmail={mailbox.account.email}
            accountName={mailbox.account.displayName}
            appVersion={auth.appVersion}
            isDemo={mailbox.isDemo}
            connected={Boolean(auth.session)}
            connectedProvider={connectedProvider}
            commandHint={commandHint}
            onOpenPalette={() => commandPalette.openPalette()}
            navItems={mailbox.navItems}
            selectedSection={mailbox.selectedSection}
            onSelectSection={mailbox.setSelectedSection}
            onConnectGmail={auth.connectGoogle}
            onDisconnectGmail={auth.disconnectGoogle}
            authBusy={auth.isMutating}
          />
        }
        main={
          <main className="flex h-full min-h-0 flex-col">
            <ProductHeader
              accountEmail={mailbox.account.email}
              accountName={mailbox.account.displayName}
              connectedProvider={connectedProvider}
              isDemo={mailbox.isDemo}
              title={headerTitle}
              workspaceLabel={workspaceLabel}
              syncBadgeLabel={syncBadgeLabel}
              effectiveOnline={mailbox.effectiveOnline}
              commandHint={commandHint}
              selectedThreadSubject={mailbox.selectedThread?.thread.subject ?? null}
              composerOpen={mailbox.composerOpen}
              onOpenPalette={() => commandPalette.openPalette()}
              onPrimaryAction={() => {
                if (mailbox.selectedThread) {
                  mailbox.openComposer();
                  return;
                }

                commandPalette.openPalette();
              }}
            />

            {mailbox.error ? (
              <div className="border-b border-red-400/20 bg-red-400/10 px-6 py-4 text-sm text-red-100">
                {mailbox.error}
              </div>
            ) : null}

            {auth.error ? (
              <div className="border-b border-red-400/20 bg-red-400/10 px-6 py-4 text-sm text-red-100">
                {auth.error}
              </div>
            ) : null}

            {mailbox.assistantError ? (
              <div className="border-b border-amber-400/20 bg-amber-400/10 px-6 py-4 text-sm text-amber-100">
                {mailbox.assistantError}
              </div>
            ) : null}

            <div className="flex-1 min-h-0 overflow-hidden">
              {mailbox.isLoading ? (
                <div className="grid h-full place-items-center p-8 text-center">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">
                      Loading local mailbox surfaces
                    </p>
                    <p className="max-w-md text-sm leading-6 text-muted">
                      HyperMail is reading from IndexedDB, replaying queued modifiers,
                      and warming the local Gmail cache in the background.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[390px_minmax(0,1fr)]">
                  <VirtualThreadList
                    sectionLabel={mailbox.sectionLabel}
                    sectionDescription={mailbox.sectionDescription}
                    threads={mailbox.visibleThreads}
                    searchQuery={mailbox.searchQuery}
                    searchFocusNonce={mailbox.searchFocusNonce}
                    selectedThreadId={mailbox.selectedThread?.thread.id ?? null}
                    onSearchQueryChange={mailbox.setSearchQuery}
                    onClearSearch={mailbox.clearSearchQuery}
                    onSelectThread={mailbox.selectThread}
                  />
                  <ThreadView
                    thread={mailbox.selectedThread}
                    effectiveOnline={mailbox.effectiveOnline}
                    composerOpen={mailbox.composerOpen}
                    onOpenComposer={mailbox.openComposer}
                    onCloseComposer={mailbox.closeComposer}
                    onToggleStar={mailbox.toggleStar}
                    onToggleArchive={mailbox.toggleArchive}
                    onSnoozeThread={mailbox.snoozeThread}
                    onUnsnoozeThread={mailbox.unsnoozeThread}
                    onUnsubscribeThread={mailbox.unsubscribeThread}
                    loadDraft={mailbox.loadDraft}
                    saveDraft={mailbox.saveDraft}
                    onQueueReply={mailbox.queueReply}
                    onQueueReplyAt={mailbox.queueReplyAt}
                    onQueueReplyLater={mailbox.queueReplyLater}
                    activeAttachmentId={mailbox.activeAttachmentId}
                    onCacheAttachment={mailbox.cacheAttachment}
                    assistantEnabled={mailbox.assistantConfig.enabled}
                    assistantReason={mailbox.assistantConfig.reason}
                    currentSummary={mailbox.threadSummary}
                    isSummarizing={mailbox.isSummarizingThread}
                    isGeneratingDraft={mailbox.isGeneratingDraft}
                    onSummarizeThread={mailbox.generateThreadSummary}
                    onGenerateVoiceDraft={mailbox.generateVoiceDraft}
                    draftSeed={mailbox.assistantDraftSeed}
                    onConsumeDraftSeed={mailbox.clearAssistantDraftSeed}
                  />
                </div>
              )}
            </div>
          </main>
        }
        rightRail={
          <ContextRail
            senderInsight={mailbox.senderInsight}
            calendarContext={mailbox.calendarContext}
            snapshot={mailbox.snapshot}
            selectedThreadQueue={mailbox.selectedThreadQueue}
            actualOnline={mailbox.actualOnline}
            manualOffline={mailbox.manualOffline}
            effectiveOnline={mailbox.effectiveOnline}
            lastQueueError={mailbox.lastQueueError}
            isRemoteSyncing={mailbox.isRemoteSyncing}
            lastSyncedAt={mailbox.lastSyncedAt}
            syncTelemetry={mailbox.syncTelemetry}
            draftSummary={mailbox.draftSummary}
            attachmentCacheSummary={mailbox.attachmentCacheSummary}
            performanceSummary={mailbox.performanceSummary}
            dailyBrief={mailbox.dailyBrief}
            runtimeCacheStatus={runtimeCacheStatus}
            runtimeCacheDetail={runtimeCacheDetail}
            runtimeCacheItemCount={runtimeCacheItemCount}
            runtimeConfig={auth.runtimeConfig}
            releaseDiagnostics={auth.releaseDiagnostics}
            autoUpdateStatus={auth.autoUpdateStatus}
            assistantConfig={mailbox.assistantConfig}
            assistantError={mailbox.assistantError}
            threadSummary={mailbox.threadSummary}
            threadSummaryGeneratedAt={mailbox.threadSummaryGeneratedAt}
            splitSuggestion={mailbox.splitSuggestion}
            splitSuggestionGeneratedAt={mailbox.splitSuggestionGeneratedAt}
            isSummarizingThread={mailbox.isSummarizingThread}
            isClassifyingThread={mailbox.isClassifyingThread}
            selectedThread={mailbox.selectedThread}
            onToggleManualOffline={mailbox.toggleManualOffline}
            onRefreshQueue={mailbox.refreshQueue}
            onCheckForUpdates={auth.checkForUpdates}
            onDownloadUpdate={auth.downloadUpdate}
            onInstallUpdate={auth.installDownloadedUpdate}
            onOpenLogsDirectory={auth.openLogsDirectory}
            onSaveAssistantSettings={mailbox.saveAssistantSettings}
            onTestAssistantProviderConnection={mailbox.testAssistantProviderConnection}
            onListOllamaModels={mailbox.listOllamaModels}
            onSummarizeThread={mailbox.generateThreadSummary}
            onSuggestThreadSplit={mailbox.suggestThreadSplit}
            onApplySuggestedSplit={mailbox.applySuggestedSplit}
            onApplyLocalRuleSplit={mailbox.applyLocalRuleSplit}
          />
        }
      />

      <CommandPalette
        open={commandPalette.open}
        query={commandPalette.query}
        activeIndex={commandPalette.activeIndex}
        groupedCommands={commandPalette.groupedCommands}
        onClose={commandPalette.closePalette}
        onQueryChange={commandPalette.setQuery}
        onHoverIndex={commandPalette.setActiveIndex}
        onExecuteIndex={async (index) => {
          await commandPalette.executeCommand(
            commandPalette.rankedCommands[index] ?? null
          );
        }}
      />
    </>
  );
}
