import { describe, expect, it } from "vitest";
import {
  formatSendLaterLabel,
  parseNaturalLanguageSendLater
} from "./send-later";

describe("send later parser", () => {
  const now = new Date("2026-04-20T10:15:00");

  it("parses relative hour offsets", () => {
    const schedule = parseNaturalLanguageSendLater("in 2h", now);

    expect(schedule?.sendAt).toBe(new Date("2026-04-20T12:15:00").getTime());
  });

  it("parses tomorrow with an explicit clock time", () => {
    const schedule = parseNaturalLanguageSendLater("tomorrow 8am", now);

    expect(schedule?.sendAt).toBe(new Date("2026-04-21T08:00:00").getTime());
  });

  it("parses weekday schedules into the next matching day", () => {
    const schedule = parseNaturalLanguageSendLater("fri 9:30am", now);

    expect(schedule?.sendAt).toBe(new Date("2026-04-24T09:30:00").getTime());
  });

  it("rolls bare times to tomorrow when today has already passed", () => {
    const schedule = parseNaturalLanguageSendLater("9am", now);

    expect(schedule?.sendAt).toBe(new Date("2026-04-21T09:00:00").getTime());
  });

  it("returns null for unsupported phrases", () => {
    expect(parseNaturalLanguageSendLater("next quarter", now)).toBeNull();
  });

  it("formats labels for the scheduled timestamp", () => {
    expect(
      formatSendLaterLabel(new Date("2026-04-24T09:30:00").getTime()).length
    ).toBeGreaterThan(8);
  });
});
