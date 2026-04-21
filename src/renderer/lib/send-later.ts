const weekdayIndex: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};

export interface ParsedSendLaterSchedule {
  sendAt: number;
  label: string;
}

export function parseNaturalLanguageSendLater(
  value: string,
  now = new Date()
): ParsedSendLaterSchedule | null {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");

  if (!normalized) {
    return null;
  }

  const relativeMatch = normalized.match(
    /^in (\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/
  );

  if (relativeMatch) {
    const amount = Number.parseInt(relativeMatch[1] ?? "0", 10);
    const unit = relativeMatch[2] ?? "";
    const multiplier = unit.startsWith("m")
      ? 60_000
      : unit.startsWith("h")
        ? 60 * 60_000
        : 24 * 60 * 60_000;
    return buildSchedule(now.getTime() + amount * multiplier);
  }

  const tomorrowMatch = normalized.match(/^tomorrow(?: at)? (.+)$/);

  if (tomorrowMatch?.[1]) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduled = applyClockTime(tomorrow, tomorrowMatch[1]);
    return scheduled ? buildSchedule(scheduled.getTime()) : null;
  }

  const weekdayMatch = normalized.match(
    /^(sun|sunday|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)(?: at)? (.+)$/
  );

  if (weekdayMatch?.[1] && weekdayMatch[2]) {
    const targetWeekday = weekdayIndex[weekdayMatch[1]];

    if (targetWeekday === undefined) {
      return null;
    }

    const candidate = nextWeekday(now, targetWeekday);
    const scheduled = applyClockTime(candidate, weekdayMatch[2]);
    return scheduled ? buildSchedule(scheduled.getTime()) : null;
  }

  const bareTime = applyClockTime(new Date(now), normalized);

  if (bareTime) {
    if (bareTime.getTime() <= now.getTime()) {
      bareTime.setDate(bareTime.getDate() + 1);
    }

    return buildSchedule(bareTime.getTime());
  }

  return null;
}

export function formatSendLaterLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function getDefaultSnoozeTimestamp(now = new Date()): number {
  const parsed = parseNaturalLanguageSendLater("tomorrow 8am", now);

  if (!parsed) {
    return now.getTime() + 24 * 60 * 60 * 1000;
  }

  return parsed.sendAt;
}

function buildSchedule(sendAt: number): ParsedSendLaterSchedule {
  return {
    sendAt,
    label: formatSendLaterLabel(sendAt)
  };
}

function nextWeekday(now: Date, targetWeekday: number): Date {
  const candidate = new Date(now);
  const currentWeekday = candidate.getDay();
  let diff = (targetWeekday - currentWeekday + 7) % 7;

  if (diff === 0) {
    diff = 7;
  }

  candidate.setDate(candidate.getDate() + diff);
  return candidate;
}

function applyClockTime(baseDate: Date, value: string): Date | null {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);

  if (!match) {
    return null;
  }

  let hour = Number.parseInt(match[1] ?? "0", 10);
  const minute = Number.parseInt(match[2] ?? "0", 10);
  const meridiem = match[3];

  if (minute > 59 || hour > 23 || hour === 0 && meridiem) {
    return null;
  }

  if (meridiem) {
    if (hour > 12) {
      return null;
    }

    if (meridiem === "am") {
      hour = hour === 12 ? 0 : hour;
    } else {
      hour = hour === 12 ? 12 : hour + 12;
    }
  }

  const next = new Date(baseDate);
  next.setSeconds(0, 0);
  next.setHours(hour, minute, 0, 0);
  return next;
}
