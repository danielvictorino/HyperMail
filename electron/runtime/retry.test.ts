import { describe, expect, it, vi } from "vitest";
import {
  createSingleFlight,
  parseRetryAfterHeader,
  retryWithBackoff
} from "./retry";

describe("retryWithBackoff", () => {
  it("returns on the first successful attempt", async () => {
    const op = vi.fn(async () => "ok");
    const result = await retryWithBackoff(op);
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors up to maxAttempts", async () => {
    let calls = 0;
    const op = vi.fn(async () => {
      calls += 1;
      if (calls < 3) {
        const err = new Error("429") as Error & { status: number };
        err.status = 429;
        throw err;
      }
      return "ok";
    });
    const result = await retryWithBackoff(op, {
      maxAttempts: 3,
      baseDelayMs: 1
    });
    expect(result).toBe("ok");
    expect(op).toHaveBeenCalledTimes(3);
  });

  it("fails fast on non-transient errors", async () => {
    const err = new Error("400") as Error & { status: number };
    err.status = 400;
    const op = vi.fn(async () => {
      throw err;
    });
    await expect(
      retryWithBackoff(op, { maxAttempts: 3, baseDelayMs: 1 })
    ).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("surfaces the last error after exhausting attempts", async () => {
    const err = new Error("500") as Error & { status: number };
    err.status = 500;
    const op = vi.fn(async () => {
      throw err;
    });
    await expect(
      retryWithBackoff(op, { maxAttempts: 2, baseDelayMs: 1 })
    ).rejects.toBe(err);
    expect(op).toHaveBeenCalledTimes(2);
  });
});

describe("parseRetryAfterHeader", () => {
  it("parses seconds", () => {
    expect(parseRetryAfterHeader("5")).toBe(5000);
  });
  it("returns null for empty", () => {
    expect(parseRetryAfterHeader(null)).toBe(null);
    expect(parseRetryAfterHeader("")).toBe(null);
  });
  it("parses HTTP date", () => {
    const future = new Date(Date.now() + 10_000).toUTCString();
    const parsed = parseRetryAfterHeader(future);
    expect(parsed).not.toBeNull();
    expect(parsed!).toBeGreaterThan(0);
  });
});

describe("createSingleFlight", () => {
  it("coalesces concurrent calls with the same key", async () => {
    const flight = createSingleFlight<string, number>();
    const op = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 5));
      return 42;
    });
    const [a, b, c] = await Promise.all([
      flight("k", op),
      flight("k", op),
      flight("k", op)
    ]);
    expect([a, b, c]).toEqual([42, 42, 42]);
    expect(op).toHaveBeenCalledTimes(1);
  });

  it("releases the slot after completion so subsequent calls rerun", async () => {
    const flight = createSingleFlight<string, number>();
    let value = 1;
    const op = vi.fn(async () => value);
    const first = await flight("k", op);
    value = 2;
    const second = await flight("k", op);
    expect(first).toBe(1);
    expect(second).toBe(2);
    expect(op).toHaveBeenCalledTimes(2);
  });
});
