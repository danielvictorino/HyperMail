import { isGoogleAccountId } from "@shared/mail/provider-ids";
import { getDesktopApi } from "@/lib/desktop-api";
import type {
  SendDraftInput,
  SetThreadArchivedInput,
  SetThreadSnoozedInput,
  SetThreadStarredInput,
  UnsubscribeThreadInput
} from "./mail-gateway";
import { type MailGateway } from "./mail-gateway";

export class ProviderMailGateway implements MailGateway {
  constructor(private readonly demoGateway: MailGateway) {}

  async setThreadStarred(input: SetThreadStarredInput): Promise<void> {
    if (!isGoogleAccountId(input.accountId)) {
      await this.demoGateway.setThreadStarred(input);
      return;
    }

    await getDesktopApi().mail.setThreadStarred(input);
  }

  async setThreadArchived(input: SetThreadArchivedInput): Promise<void> {
    if (!isGoogleAccountId(input.accountId)) {
      await this.demoGateway.setThreadArchived(input);
      return;
    }

    await getDesktopApi().mail.setThreadArchived(input);
  }

  async setThreadSnoozed(input: SetThreadSnoozedInput): Promise<void> {
    await this.demoGateway.setThreadSnoozed(input);
  }

  async unsubscribeThread(input: UnsubscribeThreadInput): Promise<void> {
    if (!isGoogleAccountId(input.accountId)) {
      await this.demoGateway.unsubscribeThread(input);
      return;
    }

    await getDesktopApi().mail.unsubscribeGmailThread(input);
  }

  async sendDraft(
    input: SendDraftInput
  ): Promise<{ remoteMessageId?: string; sentAt: number }> {
    if (!isGoogleAccountId(input.accountId)) {
      return await this.demoGateway.sendDraft(input);
    }

    return await getDesktopApi().mail.sendGmailDraft(input);
  }
}
