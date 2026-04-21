import "fake-indexeddb/auto";

import { afterEach, describe, expect, it } from "vitest";
import type { PersistedModifierRecord } from "@shared/mail/models";
import { HypermailDatabase } from "../db/hypermail-db";

function makeRecord(id: string): PersistedModifierRecord {
  return {
    id,
    type: "set-thread-starred",
    aggregateKey: `agg:${id}`,
    accountId: "acc",
    threadId: "thr",
    payload: { accountId: "acc", threadId: "thr", starred: true },
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nextAttemptAt: 0,
    idempotencyKey: `k:${id}`
  };
}

describe("modifier queue durability across db reopen", () => {
  const dbName = `hypermail-durability-${crypto.randomUUID()}`;
  let database: HypermailDatabase;

  afterEach(async () => {
    if (database) {
      await database.delete();
    }
  });

  it("survives simulated app kill and restart", async () => {
    database = new HypermailDatabase(dbName);
    await database.queuedModifiers.put(makeRecord("m1"));
    await database.queuedModifiers.put(makeRecord("m2"));
    await database.close();

    const reopened = new HypermailDatabase(dbName);
    const all = await reopened.queuedModifiers.toArray();
    expect(all.map((r) => r.id).sort()).toEqual(["m1", "m2"]);
    expect(all.every((r) => r.status === "pending")).toBe(true);
    database = reopened;
  });

  it("persists status transitions across reopen", async () => {
    database = new HypermailDatabase(dbName);
    const record = makeRecord("m1");
    await database.queuedModifiers.put(record);
    await database.queuedModifiers.update("m1", {
      status: "retry",
      attempts: 1,
      lastError: "transient 503"
    });
    await database.close();

    const reopened = new HypermailDatabase(dbName);
    const fetched = await reopened.queuedModifiers.get("m1");
    expect(fetched?.status).toBe("retry");
    expect(fetched?.attempts).toBe(1);
    expect(fetched?.lastError).toBe("transient 503");
    database = reopened;
  });
});
