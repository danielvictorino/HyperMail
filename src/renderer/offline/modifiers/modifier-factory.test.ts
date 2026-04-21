import { describe, expect, it } from "vitest";
import type { ThreadSnapshot } from "@shared/mail/models";
import { applyModifiersToThread } from "./modifier-factory";
import { SetThreadSnoozedModifier } from "./set-thread-snoozed-modifier";
import { SetThreadStarredModifier } from "./set-thread-starred-modifier";
import { UnsubscribeThreadModifier } from "./unsubscribe-thread-modifier";

function createBaseSnapshot(): ThreadSnapshot {
  return {
    thread: {
      id: "thread-1",
      accountId: "account-1",
      subject: "Modifier ordering",
      snippet: "Testing replay order",
      participantNames: ["Ada"],
      participantEmails: ["ada@example.com"],
      split: "important",
      unread: true,
      starred: false,
      archived: false,
      snoozedUntil: null,
      unsubscribe: null,
      unsubscribedAt: null,
      lastMessageAt: 1,
      messageIds: ["message-1"],
      updatedAt: 1
    },
    messages: [
      {
        id: "message-1",
        accountId: "account-1",
        threadId: "thread-1",
        subject: "Modifier ordering",
        fromName: "Ada",
        fromEmail: "ada@example.com",
        to: ["daniel@example.com"],
        cc: [],
        bodyPlain: "Replay should stay deterministic.",
        unread: true,
        starred: false,
        archived: false,
        labelIds: ["INBOX"],
        attachments: [],
        deliveryState: "sent",
        sentAt: 1
      }
    ]
  };
}

describe("applyModifiersToThread", () => {
  it("replays modifiers in creation order", () => {
    const baseSnapshot = createBaseSnapshot();
    const starModifier = SetThreadStarredModifier.create(
      "account-1",
      "thread-1",
      true
    ).toRecord();
    const unstarModifier = SetThreadStarredModifier.create(
      "account-1",
      "thread-1",
      false
    ).toRecord();

    starModifier.createdAt = 10;
    unstarModifier.createdAt = 11;

    const projected = applyModifiersToThread(baseSnapshot, [
      unstarModifier,
      starModifier
    ]);

    expect(projected.thread.starred).toBe(false);
    expect(projected.messages[0]?.starred).toBe(false);
    expect(projected.messages[0]?.labelIds.includes("STARRED")).toBe(false);
  });

  it("does not mutate the base snapshot when projecting", () => {
    const baseSnapshot = createBaseSnapshot();
    const starModifier = SetThreadStarredModifier.create(
      "account-1",
      "thread-1",
      true
    ).toRecord();

    const projected = applyModifiersToThread(baseSnapshot, [starModifier]);

    expect(projected.thread.starred).toBe(true);
    expect(baseSnapshot.thread.starred).toBe(false);
    expect(baseSnapshot.messages[0]?.starred).toBe(false);
  });

  it("applies snooze modifiers without mutating the base snapshot", () => {
    const baseSnapshot = createBaseSnapshot();
    const snoozedUntil = Date.now() + 60 * 60 * 1000;
    const snoozeModifier = SetThreadSnoozedModifier.create(
      "account-1",
      "thread-1",
      snoozedUntil
    ).toRecord();

    const projected = applyModifiersToThread(baseSnapshot, [snoozeModifier]);

    expect(projected.thread.snoozedUntil).toBe(snoozedUntil);
    expect(baseSnapshot.thread.snoozedUntil).toBeNull();
  });

  it("applies unsubscribe modifiers without mutating the base snapshot", () => {
    const baseSnapshot = createBaseSnapshot();
    const unsubscribeModifier = UnsubscribeThreadModifier.create(
      "account-1",
      "thread-1",
      {
        method: "mailto",
        endpoint: "mailto:unsubscribe@example.com?subject=unsubscribe",
        oneClick: false,
        sourceMessageId: "message-1",
        mailto: {
          to: ["unsubscribe@example.com"],
          subject: "unsubscribe"
        }
      }
    ).toRecord();

    const projected = applyModifiersToThread(baseSnapshot, [unsubscribeModifier]);

    expect(projected.thread.archived).toBe(true);
    expect(projected.thread.unsubscribedAt).toBeTypeOf("number");
    expect(projected.thread.unsubscribe?.method).toBe("mailto");
    expect(baseSnapshot.thread.archived).toBe(false);
    expect(baseSnapshot.thread.unsubscribedAt).toBeNull();
  });
});
