import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Inject, Injectable } from '@nestjs/common';
import {
  PushNotificationQueue,
  type PushNotificationMessage,
} from '../../shared/messaging/push-notification-queue';
import { NOTIFICATION_QUEUE_URL, SQS_CLIENT } from './sqs-client.provider';

@Injectable()
export class SqsPushNotificationQueue extends PushNotificationQueue {
  constructor(
    @Inject(SQS_CLIENT) private readonly client: SQSClient,
    @Inject(NOTIFICATION_QUEUE_URL) private readonly queueUrl: string
  ) {
    super();
  }

  async publish(message: PushNotificationMessage): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      })
    );
  }
}
