import { describe, expect, it } from "vitest";
import {
  createGoogleLocalAccount,
  mapGmailLabelsToLocal,
  mapGmailThreadToSnapshot,
  type GmailThreadResource
} from "./google-transformers";

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

describe("google-transformers", () => {
  it("maps Gmail labels and threads into local mailbox records", () => {
    const account = createGoogleLocalAccount({
      profile: {
        email: "daniel@example.com",
        name: "Daniel Victorino",
        picture: "https://example.com/avatar.png",
        messagesTotal: 20,
        threadsTotal: 8,
        historyId: "history-200"
      },
      connectedAt: 100
    });
    const labels = mapGmailLabelsToLocal(account.id, [
      {
        id: "INBOX",
        name: "Inbox",
        type: "system"
      },
      {
        id: "VIP",
        name: "VIP",
        type: "user",
        color: {
          backgroundColor: "#f97316"
        }
      }
    ]);
    const thread = mapGmailThreadToSnapshot(account, {
      id: "thread-1",
      snippet: "Can you tighten the launch reply before the demo?",
      messages: [
        {
          id: "message-1",
          threadId: "thread-1",
          labelIds: ["INBOX", "UNREAD", "IMPORTANT"],
          internalDate: String(Date.UTC(2026, 3, 20, 12, 15, 0)),
          payload: {
            headers: [
              { name: "From", value: "Maya Chen <maya@example.com>" },
              { name: "To", value: "Daniel Victorino <daniel@example.com>" },
              { name: "Subject", value: "Launch narrative" },
              { name: "Date", value: "Mon, 20 Apr 2026 12:15:00 +0000" },
              {
                name: "List-Unsubscribe",
                value:
                  "<mailto:unsubscribe@example.com?subject=unsubscribe>, <https://example.com/unsubscribe/opaque>"
              }
            ],
            parts: [
              {
                mimeType: "text/plain",
                body: {
                  data: encodeBase64Url(
                    "Can you tighten the launch reply before the demo?"
                  )
                }
              },
              {
                mimeType: "application/pdf",
                filename: "launch-outline.pdf",
                body: {
                  attachmentId: "attachment-1",
                  size: 245760
                }
              }
            ]
          }
        },
        {
          id: "message-2",
          threadId: "thread-1",
          labelIds: ["INBOX", "STARRED", "VIP"],
          internalDate: String(Date.UTC(2026, 3, 20, 12, 32, 0)),
          payload: {
            headers: [
              { name: "From", value: "Daniel Victorino <daniel@example.com>" },
              { name: "To", value: "Maya Chen <maya@example.com>" },
              { name: "Subject", value: "Re: Launch narrative" },
              { name: "Date", value: "Mon, 20 Apr 2026 12:32:00 +0000" }
            ],
            parts: [
              {
                mimeType: "text/plain",
                body: {
                  data: encodeBase64Url(
                    "Yes. I’ll tighten it to one metric, one customer proof point, and one call to action."
                  )
                }
              }
            ]
          }
        }
      ]
    } satisfies GmailThreadResource);

    expect(labels).toHaveLength(2);
    expect(labels[1]?.color).toBe("#f97316");
    expect(thread?.thread.id).toBe("google:daniel@example.com:thread:thread-1");
    expect(thread?.thread.split).toBe("vip");
    expect(thread?.thread.unread).toBe(true);
    expect(thread?.thread.starred).toBe(true);
    expect(thread?.thread.archived).toBe(false);
    expect(thread?.thread.unsubscribe?.method).toBe("mailto");
    expect(thread?.thread.unsubscribe?.mailto?.to).toEqual(["unsubscribe@example.com"]);
    expect(thread?.thread.participantNames).toEqual(["Maya Chen"]);
    expect(thread?.messages[0]?.fromEmail).toBe("maya@example.com");
    expect(thread?.messages[1]?.to).toEqual(["maya@example.com"]);
    expect(thread?.messages[0]?.attachments[0]?.filename).toBe("launch-outline.pdf");
    expect(thread?.messages[1]?.bodyPlain).toContain("one metric");
  });

  it("drops spam and trash threads from the local cache", () => {
    const account = createGoogleLocalAccount({
      profile: {
        email: "daniel@example.com",
        name: "Daniel Victorino",
        picture: undefined,
        messagesTotal: 2,
        threadsTotal: 1,
        historyId: "history-201"
      },
      connectedAt: 100
    });

    const thread = mapGmailThreadToSnapshot(account, {
      id: "thread-spam",
      messages: [
        {
          id: "message-spam",
          threadId: "thread-spam",
          labelIds: ["SPAM"],
          payload: {
            headers: [
              { name: "From", value: "Spam Bot <bot@example.com>" },
              { name: "Subject", value: "Buy now" }
            ],
            body: {
              data: encodeBase64Url("Definitely not worth showing in the inbox.")
            }
          }
        }
      ]
    } satisfies GmailThreadResource);

    expect(thread).toBeNull();
  });

  it("promotes direct action-oriented threads into the important split even without Gmail IMPORTANT", () => {
    const account = createGoogleLocalAccount({
      profile: {
        email: "daniel@example.com",
        name: "Daniel Victorino",
        picture: undefined,
        messagesTotal: 2,
        threadsTotal: 1,
        historyId: "history-202"
      },
      connectedAt: 100
    });

    const thread = mapGmailThreadToSnapshot(account, {
      id: "thread-important",
      snippet: "Can you review the launch note before tomorrow's demo?",
      messages: [
        {
          id: "message-important",
          threadId: "thread-important",
          labelIds: ["INBOX", "UNREAD"],
          internalDate: String(Date.UTC(2026, 3, 20, 13, 15, 0)),
          payload: {
            headers: [
              { name: "From", value: "Maya Chen <maya@example.com>" },
              { name: "To", value: "Daniel Victorino <daniel@example.com>" },
              { name: "Subject", value: "Can you review the launch note?" },
              { name: "Date", value: "Mon, 20 Apr 2026 13:15:00 +0000" }
            ],
            body: {
              data: encodeBase64Url(
                "Can you review the launch note before tomorrow's demo?"
              )
            }
          }
        }
      ]
    } satisfies GmailThreadResource);

    expect(thread?.thread.split).toBe("important");
  });

  it("prefers RFC 8058 one-click unsubscribe when present", () => {
    const account = createGoogleLocalAccount({
      profile: {
        email: "daniel@example.com",
        name: "Daniel Victorino",
        picture: undefined,
        messagesTotal: 1,
        threadsTotal: 1,
        historyId: "history-203"
      },
      connectedAt: 100
    });

    const thread = mapGmailThreadToSnapshot(account, {
      id: "thread-unsubscribe",
      messages: [
        {
          id: "message-unsubscribe",
          threadId: "thread-unsubscribe",
          labelIds: ["INBOX"],
          internalDate: String(Date.UTC(2026, 3, 20, 14, 0, 0)),
          payload: {
            headers: [
              { name: "From", value: "Orbit News <digest@example.com>" },
              { name: "To", value: "Daniel Victorino <daniel@example.com>" },
              { name: "Subject", value: "Orbit digest" },
              { name: "Date", value: "Mon, 20 Apr 2026 14:00:00 +0000" },
              {
                name: "List-Unsubscribe",
                value:
                  "<mailto:unsubscribe@example.com?subject=unsubscribe>, <https://example.com/unsubscribe/opaque>"
              },
              {
                name: "List-Unsubscribe-Post",
                value: "List-Unsubscribe=One-Click"
              }
            ],
            body: {
              data: encodeBase64Url("Digest body")
            }
          }
        }
      ]
    } satisfies GmailThreadResource);

    expect(thread?.thread.unsubscribe).toEqual({
      method: "http-post",
      endpoint: "https://example.com/unsubscribe/opaque",
      oneClick: true,
      sourceMessageId: "google:daniel@example.com:message:message-unsubscribe"
    });
  });
});
