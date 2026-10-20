import { Module } from '@nestjs/common';
import { PushNotificationQueue } from '../../shared/messaging/push-notification-queue';
import {
  createSqsClient,
  getNotificationQueueUrl,
  NOTIFICATION_QUEUE_URL,
  SQS_CLIENT,
} from './sqs-client.provider';
import { SqsPushNotificationQueue } from './sqs-push-notification-queue';

@Module({
  providers: [
    { provide: SQS_CLIENT, useFactory: createSqsClient },
    { provide: NOTIFICATION_QUEUE_URL, useFactory: getNotificationQueueUrl },
    SqsPushNotificationQueue,
    {
      provide: PushNotificationQueue,
      useExisting: SqsPushNotificationQueue,
    },
  ],
  exports: [PushNotificationQueue],
})
export class MessagingModule {}
