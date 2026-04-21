import { hypermailDb } from "./db/hypermail-db";
import { OutboxEngine } from "./outbox/outbox-engine";
import { DemoMailGateway } from "./queue/demo-mail-gateway";
import { ModifierQueueEngine } from "./queue/modifier-queue-engine";
import { ProviderMailGateway } from "./queue/provider-mail-gateway";
import { getEffectiveOnline, useConnectivityStore } from "../state/connectivity-store";

const connectivityAdapter = {
  isOnline: () => getEffectiveOnline(),
  subscribe: (listener: () => void) => useConnectivityStore.subscribe(listener),
  setQueueError: (message: string | null) =>
    useConnectivityStore.getState().setQueueError(message)
};

const demoGateway = new DemoMailGateway({
  isOnline: () => connectivityAdapter.isOnline()
});
const gateway = new ProviderMailGateway(demoGateway);

export const modifierQueueEngine = new ModifierQueueEngine(
  hypermailDb,
  gateway,
  connectivityAdapter
);
export const outboxEngine = new OutboxEngine(hypermailDb, gateway, connectivityAdapter);

let started = false;

export function startOfflineRuntime(): void {
  if (started) {
    return;
  }

  started = true;
  modifierQueueEngine.start();
  outboxEngine.start();
}
