export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isTransient?: (error: unknown) => boolean;
  getRetryAfterMs?: (error: unknown) => number | null;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoff(attempt: number, base: number, cap: number): number {
  const exponent = Math.min(attempt, 10);
  const exponential = Math.min(base * 2 ** exponent, cap);
  const jitter = Math.random() * (exponential * 0.25);
  return Math.floor(exponential + jitter);
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const base = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const cap = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const isTransient = options.isTransient ?? defaultIsTransient;
  const getRetryAfterMs = options.getRetryAfterMs ?? (() => null);

  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLast = attempt === maxAttempts - 1;
      if (isLast || !isTransient(error)) {
        throw error;
      }
      const retryAfter = getRetryAfterMs(error);
      const delay =
        retryAfter !== null && retryAfter >= 0
          ? Math.min(retryAfter, cap)
          : computeBackoff(attempt, base, cap);
      options.onRetry?.(attempt + 1, delay, error);
      await sleep(delay);
    }
  }
  throw lastError;
}

function defaultIsTransient(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: number }).status;
  if (typeof status === "number") {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
    return false;
  }
  const code = (error as { code?: string }).code;
  if (typeof code === "string") {
    const transientCodes = new Set([
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENETUNREACH",
      "ENOTFOUND",
      "EAI_AGAIN",
      "UND_ERR_SOCKET",
      "UND_ERR_CONNECT_TIMEOUT"
    ]);
    if (transientCodes.has(code)) return true;
  }
  return false;
}

export function parseRetryAfterHeader(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.floor(asSeconds * 1000);
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : 0;
  }
  return null;
}

type PendingMap<K, V> = Map<K, Promise<V>>;

export function createSingleFlight<K, V>(): (
  key: K,
  operation: () => Promise<V>
) => Promise<V> {
  const pending: PendingMap<K, V> = new Map();
  return (key, operation) => {
    const inflight = pending.get(key);
    if (inflight) return inflight;
    const promise = (async () => {
      try {
        return await operation();
      } finally {
        pending.delete(key);
      }
    })();
    pending.set(key, promise);
    return promise;
  };
}
