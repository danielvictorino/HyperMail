import { describe, expect, it } from "vitest";
import { getGmailSyncRecoveryReason } from "./gmail-sync-recovery";

describe("getGmailSyncRecoveryReason", () => {
  it("recovers to a full sync when Gmail history is no longer available", () => {
    expect(
      getGmailSyncRecoveryReason({
        status: 404,
        path: "/history?startHistoryId=123",
        detail: "Requested entity was not found."
      })
    ).toBe("history-gap");
  });

  it("recovers when Gmail rejects an invalid startHistoryId", () => {
    expect(
      getGmailSyncRecoveryReason({
        status: 400,
        message: "Invalid startHistoryId"
      })
    ).toBe("history-gap");
  });

  it("does not hide unrelated Gmail failures", () => {
    expect(
      getGmailSyncRecoveryReason({
        status: 401,
        path: "/threads",
        detail: "Request had invalid authentication credentials."
      })
    ).toBeNull();
  });
});
