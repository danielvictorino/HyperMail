import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GmailMailboxSyncPayload } from "@shared/contracts";
import { HypermailDatabase } from "../db/hypermail-db";
import { applyGmailSyncPayload, getGmailHistoryId, getLastGmailSyncedAt } from "./gmail-sync";

describe("applyGmailSyncPayload", () => {
  let database: HypermailDatabase;

  beforeEach(() => {
    database = new HypermailDatabase(`hypermail-sync-test-${crypto.randomUUID()}`);
  });

  afterEach(async () => {
    await database.delete();
  });

  it("prunes stale Gmail threads and queue records during full sync", async () => {
    const accountId = "google:daniel@example.com";
    const staleThreadId = `${accountId}:thread:stale-thread`;

    await database.accounts.put({
      id: accountId,
      email: "daniel@example.com",
      displayName: "Daniel",
      provider: "google",
      connectedAt: 1,
      updatedAt: 1
    });

    await database.threads.put({
      id: staleThreadId,
      accountId,
      subject: "Stale",
      snippet: "Old thread",
      participantNames: ["Stale Contact"],
      participantEmails: ["stale@example.com"],
      split: "other",
      unread: false,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: 1,
      messageIds: [`${accountId}:message:stale-message`],
      updatedAt: 1
    });

    await database.messages.put({
      id: `${accountId}:message:stale-message`,
      accountId,
      threadId: staleThreadId,
      subject: "Stale",
      fromName: "Stale Contact",
      fromEmail: "stale@example.com",
      to: ["daniel@example.com"],
      cc: [],
      bodyPlain: "This should disappear after the full sync.",
      unread: false,
      starred: false,
      archived: false,
      labelIds: ["INBOX"],
      attachments: [],
      deliveryState: "sent",
      sentAt: 1
    });

    await database.attachmentCache.put({
      id: `${accountId}:message:stale-message:attachment-cache:stale-attachment`,
      accountId,
      threadId: staleThreadId,
      messageId: `${accountId}:message:stale-message`,
      attachmentId: "stale-attachment",
      filename: "stale.pdf",
      mimeType: "application/pdf",
      size: 1024,
      contentBase64: "c3RhbGU=",
      downloadedAt: 1,
      updatedAt: 1
    });

    await database.queuedModifiers.put({
      id: "queued-stale",
      type: "set-thread-starred",
      aggregateKey: staleThreadId,
      accountId,
      threadId: staleThreadId,
      payload: {
        accountId,
        threadId: staleThreadId,
        starred: true
      },
      status: "pending",
      attempts: 0,
      createdAt: 1,
      updatedAt: 1,
      nextAttemptAt: 1,
      idempotencyKey: "stale-op"
    });

    const payload: GmailMailboxSyncPayload = {
      account: {
        id: accountId,
        email: "daniel@example.com",
        displayName: "Daniel Victorino",
        provider: "google",
        connectedAt: 10,
        updatedAt: 10
      },
      labels: [
        {
          id: `${accountId}:label:INBOX`,
          accountId,
          name: "Inbox",
          color: "#6b7280",
          kind: "system"
        }
      ],
      threadSnapshots: [
        {
          thread: {
            id: `${accountId}:thread:live-thread`,
            accountId,
            subject: "Fresh Gmail thread",
            snippet: "Synced from Gmail",
            participantNames: ["Maya Chen"],
            participantEmails: ["maya@example.com"],
            split: "important",
            unread: true,
            starred: true,
            archived: false,
            snoozedUntil: null,
            unsubscribe: null,
            unsubscribedAt: null,
            lastMessageAt: 20,
            messageIds: [`${accountId}:message:live-message`],
            updatedAt: 20
          },
          messages: [
            {
              id: `${accountId}:message:live-message`,
              accountId,
              threadId: `${accountId}:thread:live-thread`,
              subject: "Fresh Gmail thread",
              fromName: "Maya Chen",
              fromEmail: "maya@example.com",
              to: ["daniel@example.com"],
              cc: [],
              bodyPlain: "The Gmail sync writer should keep only the current thread set.",
              unread: true,
              starred: true,
              archived: false,
              labelIds: ["INBOX", "STARRED"],
              attachments: [],
              deliveryState: "sent",
              sentAt: 20
            }
          ]
        }
      ],
      removedThreadIds: [],
      activeThreadIds: [`${accountId}:thread:live-thread`],
      historyId: "history-500",
      mode: "full",
      recoveryReason: null,
      syncedAt: 500
    };

    await applyGmailSyncPayload(payload, database);

    expect(await database.threads.get(staleThreadId)).toBeUndefined();
    expect(await database.messages.get(`${accountId}:message:stale-message`)).toBeUndefined();
    expect(
      await database.attachmentCache.get(
        `${accountId}:message:stale-message:attachment-cache:stale-attachment`
      )
    ).toBeUndefined();
    expect(await database.queuedModifiers.get("queued-stale")).toBeUndefined();
    expect(await database.threads.get(`${accountId}:thread:live-thread`)).toBeDefined();
    expect(await getGmailHistoryId(accountId, database)).toBe("history-500");
    expect(await getLastGmailSyncedAt(accountId, database)).toBe(500);
  });

  it("removes only explicitly deleted Gmail threads during incremental sync", async () => {
    const accountId = "google:daniel@example.com";
    const removedThreadId = `${accountId}:thread:removed`;
    const preservedThreadId = `${accountId}:thread:preserved`;

    await database.threads.bulkPut([
      {
        id: removedThreadId,
        accountId,
        subject: "Removed remotely",
        snippet: "Should disappear",
        participantNames: ["Removed Contact"],
        participantEmails: ["removed@example.com"],
        split: "other",
        unread: false,
        starred: false,
        archived: false,
        snoozedUntil: null,
        unsubscribe: null,
        unsubscribedAt: null,
        lastMessageAt: 1,
        messageIds: [],
        updatedAt: 1
      },
      {
        id: preservedThreadId,
        accountId,
        subject: "Preserved locally",
        snippet: "Should stay",
        participantNames: ["Preserved Contact"],
        participantEmails: ["preserved@example.com"],
        split: "important",
        unread: false,
        starred: false,
        archived: false,
        snoozedUntil: null,
        unsubscribe: null,
        unsubscribedAt: null,
        lastMessageAt: 2,
        messageIds: [],
        updatedAt: 2
      }
    ]);

    await applyGmailSyncPayload(
      {
        account: {
          id: accountId,
          email: "daniel@example.com",
          displayName: "Daniel Victorino",
          provider: "google",
          connectedAt: 10,
          updatedAt: 10
        },
        labels: [],
        threadSnapshots: [],
        removedThreadIds: [removedThreadId],
        activeThreadIds: [],
        historyId: "history-600",
        mode: "incremental",
        recoveryReason: null,
        syncedAt: 600
      },
      database
    );

    expect(await database.threads.get(removedThreadId)).toBeUndefined();
    expect(await database.threads.get(preservedThreadId)).toBeDefined();
  });

  it("preserves an active local snooze when Gmail sync refreshes a thread", async () => {
    const accountId = "google:daniel@example.com";
    const threadId = `${accountId}:thread:live-thread`;
    const snoozedUntil = Date.now() + 3 * 60 * 60 * 1000;

    await database.threads.put({
      id: threadId,
      accountId,
      subject: "Existing local thread",
      snippet: "Locally snoozed",
      participantNames: ["Maya Chen"],
      participantEmails: ["maya@example.com"],
      split: "important",
      unread: false,
      starred: false,
      archived: false,
      snoozedUntil,
      unsubscribe: {
        method: "mailto",
        endpoint: "mailto:unsubscribe@example.com?subject=unsubscribe",
        oneClick: false,
        sourceMessageId: `${accountId}:message:existing-message`,
        mailto: {
          to: ["unsubscribe@example.com"],
          subject: "unsubscribe"
        }
      },
      unsubscribedAt: 123,
      lastMessageAt: 10,
      messageIds: [],
      updatedAt: 10
    });

    await applyGmailSyncPayload(
      {
        account: {
          id: accountId,
          email: "daniel@example.com",
          displayName: "Daniel Victorino",
          provider: "google",
          connectedAt: 10,
          updatedAt: 10
        },
        labels: [],
        threadSnapshots: [
          {
            thread: {
              id: threadId,
              accountId,
              subject: "Fresh Gmail thread",
              snippet: "Synced from Gmail",
              participantNames: ["Maya Chen"],
              participantEmails: ["maya@example.com"],
              split: "important",
              unread: true,
              starred: false,
              archived: false,
              snoozedUntil: null,
              unsubscribe: null,
              unsubscribedAt: null,
              lastMessageAt: 20,
              messageIds: [`${accountId}:message:live-message`],
              updatedAt: 20
            },
            messages: [
              {
                id: `${accountId}:message:live-message`,
                accountId,
                threadId,
                subject: "Fresh Gmail thread",
                fromName: "Maya Chen",
                fromEmail: "maya@example.com",
                to: ["daniel@example.com"],
                cc: [],
                bodyPlain: "Keep the local snooze until it expires.",
                unread: true,
                starred: false,
                archived: false,
                labelIds: ["INBOX"],
                attachments: [],
                deliveryState: "sent",
                sentAt: 20
              }
            ]
          }
        ],
        removedThreadIds: [],
        activeThreadIds: [],
        historyId: "history-700",
        mode: "incremental",
        recoveryReason: null,
        syncedAt: 700
      },
      database
    );

    expect((await database.threads.get(threadId))?.snoozedUntil).toBe(snoozedUntil);
    expect((await database.threads.get(threadId))?.unsubscribedAt).toBe(123);
    expect((await database.threads.get(threadId))?.unsubscribe?.method).toBe("mailto");
  });

  it("removes cached attachments for stale messages when a Gmail thread refreshes", async () => {
    const accountId = "google:daniel@example.com";
    const threadId = `${accountId}:thread:live-thread`;
    const staleMessageId = `${accountId}:message:stale-message`;

    await database.threads.put({
      id: threadId,
      accountId,
      subject: "Existing thread",
      snippet: "Has a stale attachment cache entry",
      participantNames: ["Maya Chen"],
      participantEmails: ["maya@example.com"],
      split: "important",
      unread: false,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: 10,
      messageIds: [staleMessageId],
      updatedAt: 10
    });

    await database.messages.put({
      id: staleMessageId,
      accountId,
      threadId,
      subject: "Existing thread",
      fromName: "Maya Chen",
      fromEmail: "maya@example.com",
      to: ["daniel@example.com"],
      cc: [],
      bodyPlain: "This message should be replaced by the refreshed snapshot.",
      unread: false,
      starred: false,
      archived: false,
      labelIds: ["INBOX"],
      attachments: [
        {
          id: `${staleMessageId}:attachment:launch-outline`,
          attachmentId: "launch-outline",
          filename: "launch-outline.pdf",
          mimeType: "application/pdf",
          size: 2048,
          cacheState: "cached"
        }
      ],
      deliveryState: "sent",
      sentAt: 10
    });

    await database.attachmentCache.put({
      id: `${staleMessageId}:attachment-cache:launch-outline`,
      accountId,
      threadId,
      messageId: staleMessageId,
      attachmentId: "launch-outline",
      filename: "launch-outline.pdf",
      mimeType: "application/pdf",
      size: 2048,
      contentBase64: "bGF1bmNo",
      downloadedAt: 10,
      updatedAt: 10
    });

    await applyGmailSyncPayload(
      {
        account: {
          id: accountId,
          email: "daniel@example.com",
          displayName: "Daniel Victorino",
          provider: "google",
          connectedAt: 10,
          updatedAt: 10
        },
        labels: [],
        threadSnapshots: [
          {
            thread: {
              id: threadId,
              accountId,
              subject: "Refreshed thread",
              snippet: "Fresh snapshot",
              participantNames: ["Maya Chen"],
              participantEmails: ["maya@example.com"],
              split: "important",
              unread: true,
              starred: false,
              archived: false,
              snoozedUntil: null,
              unsubscribe: null,
              unsubscribedAt: null,
              lastMessageAt: 20,
              messageIds: [`${accountId}:message:fresh-message`],
              updatedAt: 20
            },
            messages: [
              {
                id: `${accountId}:message:fresh-message`,
                accountId,
                threadId,
                subject: "Refreshed thread",
                fromName: "Maya Chen",
                fromEmail: "maya@example.com",
                to: ["daniel@example.com"],
                cc: [],
                bodyPlain: "Only the fresh Gmail message should remain cached.",
                unread: true,
                starred: false,
                archived: false,
                labelIds: ["INBOX"],
                attachments: [],
                deliveryState: "sent",
                sentAt: 20
              }
            ]
          }
        ],
        removedThreadIds: [],
        activeThreadIds: [],
        historyId: "history-800",
        mode: "incremental",
        recoveryReason: null,
        syncedAt: 800
      },
      database
    );

    expect(await database.messages.get(staleMessageId)).toBeUndefined();
    expect(
      await database.attachmentCache.get(
        `${staleMessageId}:attachment-cache:launch-outline`
      )
    ).toBeUndefined();
  });
});
