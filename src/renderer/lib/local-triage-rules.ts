import type { InboxSplit, ThreadSnapshot } from "@shared/mail/models";

export interface LocalTriageSuggestion {
  split: InboxSplit;
  reason: string;
}

const VIP_DOMAINS = new Set(["galaxies.ai", "galaxies.gg", "hypermail.dev"]);
const IMPORTANT_KEYWORDS = [
  "customer",
  "demo",
  "launch",
  "pricing",
  "contract",
  "review",
  "decision",
  "urgent",
  "tomorrow"
];
const LOW_PRIORITY_KEYWORDS = [
  "newsletter",
  "digest",
  "unsubscribe",
  "webinar",
  "roundup"
];

export function suggestLocalTriageSplit(
  snapshot: ThreadSnapshot
): LocalTriageSuggestion | null {
  const participantDomains = snapshot.thread.participantEmails
    .map((email) => email.split("@")[1]?.toLowerCase())
    .filter((domain): domain is string => Boolean(domain));

  const vipDomain = participantDomains.find((domain) => VIP_DOMAINS.has(domain));

  if (vipDomain) {
    return {
      split: "vip",
      reason: `VIP domain rule matched ${vipDomain}.`
    };
  }

  const searchableText = [
    snapshot.thread.subject,
    snapshot.thread.snippet,
    ...snapshot.messages.map((message) => message.bodyPlain)
  ]
    .join(" ")
    .toLowerCase();

  const importantKeyword = IMPORTANT_KEYWORDS.find((keyword) =>
    searchableText.includes(keyword)
  );

  if (importantKeyword) {
    return {
      split: "important",
      reason: `Important keyword rule matched "${importantKeyword}".`
    };
  }

  const lowPriorityKeyword = LOW_PRIORITY_KEYWORDS.find((keyword) =>
    searchableText.includes(keyword)
  );

  if (lowPriorityKeyword) {
    return {
      split: "other",
      reason: `Low-priority keyword rule matched "${lowPriorityKeyword}".`
    };
  }

  return null;
}
