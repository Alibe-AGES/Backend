import { Injectable, Logger } from '@nestjs/common';
import { PushNotificationQueue } from '../../../shared/messaging/push-notification-queue';
import {
  EventNotificationRepository,
  type PushNotificationRecipient,
} from '../domain/event-notification.repository';

export interface GroupPushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationDeliverySummary {
  attempted: number;
  sent: number;
  failed: number;
}

@Injectable()
export class GroupPushNotificationService {
  private readonly logger = new Logger(GroupPushNotificationService.name);

  constructor(
    private readonly recipients: EventNotificationRepository,
    private readonly notifications: PushNotificationQueue
  ) {}

  async sendToGroup(
    groupId: string,
    message: GroupPushMessage,
    excludedUserId?: string
  ): Promise<NotificationDeliverySummary> {
    const recipients = await this.recipients.findGroupRecipients(groupId, excludedUserId);
    return this.sendToRecipients(recipients, message);
  }

  async sendToRecipients(
    recipients: PushNotificationRecipient[],
    message: GroupPushMessage
  ): Promise<NotificationDeliverySummary> {
    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        this.notifications.publish({
          to: recipient.pushToken,
          title: message.title,
          body: message.body,
          data: message.data,
        })
      )
    );
    const failed = results.filter((result) => result.status === 'rejected').length;

    if (failed > 0) {
      this.logger.error(`Falha ao enfileirar ${failed} de ${results.length} notificações push`);
    }

    return { attempted: results.length, sent: results.length - failed, failed };
  }
}
