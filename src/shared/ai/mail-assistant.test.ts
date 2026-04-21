import { describe, expect, it } from "vitest";
import type { LocalMailMessage } from "../mail/models";
import {
  createReplySignature,
  renderDraftSuggestionHtml,
  selectVoiceExamples
} from "./mail-assistant";

function createMessage(
  overrides: Partial<LocalMailMessage> & Pick<LocalMailMessage, "id">
): LocalMailMessage {
  return {
    id: overrides.id,
    accountId: overrides.accountId ?? "demo:hypermail",
    threadId: overrides.threadId ?? "demo:thread",
    subject: overrides.subject ?? "Re: Launch review",
    fromName: overrides.fromName ?? "Daniel Victorino",
    fromEmail: overrides.fromEmail ?? "daniel@example.com",
    to: overrides.to ?? ["maya@example.com"],
    cc: overrides.cc ?? [],
    bodyPlain:
      overrides.bodyPlain ??
      "Yes. I can tighten the narrative to one metric and one clear ask.",
    unread: overrides.unread ?? false,
    starred: overrides.starred ?? false,
    archived: overrides.archived ?? false,
    labelIds: overrides.labelIds ?? ["SENT"],
    attachments: overrides.attachments ?? [],
    deliveryState: overrides.deliveryState,
    draftId: overrides.draftId,
    sentAt: overrides.sentAt ?? Date.UTC(2026, 3, 20, 12, 30, 0)
  };
}

describe("mail-assistant helpers", () => {
  it("selects recent sent-mail examples and ignores transient deliveries", () => {
    const voiceExamples = selectVoiceExamples(
      [
        createMessage({
          id: "sent-1",
          sentAt: Date.UTC(2026, 3, 20, 12, 45, 0)
        }),
        createMessage({
          id: "sent-2",
          subject: "Re: Offline architecture",
          bodyPlain:
            "Agreed. Keep the queue local, replay deterministically, and let the UI stay immediate.",
          sentAt: Date.UTC(2026, 3, 20, 12, 40, 0)
        }),
        createMessage({
          id: "queued-1",
          deliveryState: "queued",
          bodyPlain: "This one should not become a voice example.",
          sentAt: Date.UTC(2026, 3, 20, 12, 50, 0)
        }),
        createMessage({
          id: "other-sender",
          fromEmail: "maya@example.com",
          fromName: "Maya Chen",
          bodyPlain: "Can you send the latest version?"
        })
      ],
      "daniel@example.com"
    );

    expect(voiceExamples.map((example) => example.id)).toEqual([
      "sent-1",
      "sent-2"
    ]);
    expect(voiceExamples[0]?.bodyPlain).toContain("tighten the narrative");
  });

  it("renders safe draft html from structured paragraphs", () => {
    const html = renderDraftSuggestionHtml({
      subject: "Re: Launch review",
      preview: "Condensed version ready.",
      greeting: "Hi Maya,",
      paragraphs: [
        "I can condense it to one metric and one proof point.",
        "I will send the tightened version this afternoon."
      ],
      closing: "Best,",
      signoff: "Daniel <script>",
      tone: "direct"
    });

    expect(html).toContain("<p>Hi Maya,</p>");
    expect(html).toContain("one proof point");
    expect(html).toContain("Daniel &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("creates a compact reply signature from the display name", () => {
    expect(createReplySignature("Daniel Victorino")).toBe("Daniel");
    expect(createReplySignature(" HyperMail ")).toBe("HyperMail");
  });
});
