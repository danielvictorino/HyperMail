import type { PersistedModifierRecord, QueueStatus } from "@shared/mail/models";
import {
  loadThreadSnapshot,
  type HypermailDatabase,
  writeThreadSnapshot
} from "../db/hypermail-db";
import { hydrateModifier } from "../modifiers/modifier-factory";
import type { MailGateway } from "./mail-gateway";

interface ConnectivityController {
  isOnline(): boolean;
  subscribe(listener: () => void): () => void;
  setQueueError(message: string | null): void;
}

function nextRetryDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** attempt);
}

export class ModifierQueueEngine {
  private readonly inFlightAggregates = new Set<string>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private unsubscribeConnectivity: (() => void) | null = null;

  constructor(
    private readonly database: HypermailDatabase,
    private readonly gateway: MailGateway,
    private readonly connectivity: ConnectivityController
  ) {}

  start(): void {
    if (this.intervalHandle) {
      return;
    }

    this.unsubscribeConnectivity = this.connectivity.subscribe(() => {
      void this.kick();
    });

    this.intervalHandle = globalThis.setInterval(() => {
      void this.kick();
    }, 1500);

    void this.kick();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }

    this.unsubscribeConnectivity?.();
    this.unsubscribeConnectivity = null;
  }

  async enqueue(record: PersistedModifierRecord): Promise<void> {
    await this.database.queuedModifiers.put(record);
    void this.kick();
  }

  async kick(): Promise<void> {
    if (!this.connectivity.isOnline()) {
      return;
    }

    const now = Date.now();
    const queued = await this.database.queuedModifiers.orderBy("createdAt").toArray();
    const firstReadyPerAggregate = new Map<string, PersistedModifierRecord>();

    for (const record of queued) {
      const eligible =
        (record.status === "pending" || record.status === "retry") &&
        record.nextAttemptAt <= now &&
        !this.inFlightAggregates.has(record.aggregateKey);

      if (!eligible || firstReadyPerAggregate.has(record.aggregateKey)) {
        continue;
      }

      firstReadyPerAggregate.set(record.aggregateKey, record);
    }

    await Promise.all(
      [...firstReadyPerAggregate.values()].map(async (record) => {
        await this.processRecord(record);
      })
    );
  }

  private async processRecord(record: PersistedModifierRecord): Promise<void> {
    this.inFlightAggregates.add(record.aggregateKey);

    await this.markRecord(record.id, "processing", record.attempts, Date.now());

    try {
      const modifier = hydrateModifier(record);
      await modifier.persist({
        gateway: this.gateway
      });

      await this.database.transaction(
        "rw",
        this.database.threads,
        this.database.messages,
        this.database.queuedModifiers,
        async () => {
          const baseSnapshot = await loadThreadSnapshot(
            this.database,
            modifier.threadId
          );

          if (!baseSnapshot) {
            await this.database.queuedModifiers.delete(record.id);
            return;
          }

          const committedSnapshot = modifier.modify(baseSnapshot);
          await writeThreadSnapshot(this.database, committedSnapshot);
          await this.database.queuedModifiers.delete(record.id);
        }
      );

      this.connectivity.setQueueError(null);
    } catch (error) {
      await this.handleFailure(record, error);
    } finally {
      this.inFlightAggregates.delete(record.aggregateKey);
      queueMicrotask(() => {
        void this.kick();
      });
    }
  }

  private async handleFailure(
    record: PersistedModifierRecord,
    error: unknown
  ): Promise<void> {
    const attempts = record.attempts + 1;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown queue error.";

    if (attempts >= 5) {
      await this.database.queuedModifiers.delete(record.id);
      this.connectivity.setQueueError(
        `Rolled back ${record.type} on ${record.threadId} after repeated failures.`
      );
      return;
    }

    const retryAt = Date.now() + nextRetryDelay(attempts);
    await this.markRecord(record.id, "retry", attempts, retryAt, errorMessage);
    this.connectivity.setQueueError(errorMessage);
  }

  private async markRecord(
    recordId: string,
    status: QueueStatus,
    attempts: number,
    nextAttemptAt: number,
    lastError?: string
  ): Promise<void> {
    await this.database.queuedModifiers.update(recordId, {
      status,
      attempts,
      updatedAt: Date.now(),
      nextAttemptAt,
      lastError
    });
  }
}
