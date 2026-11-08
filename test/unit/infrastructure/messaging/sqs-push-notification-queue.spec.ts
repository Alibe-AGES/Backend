import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import { SqsPushNotificationQueue } from '../../../../src/infrastructure/messaging/sqs-push-notification-queue';

describe('SqsPushNotificationQueue', () => {
  it('publishes the Expo notification as JSON', async () => {
    const send = jest.fn().mockResolvedValue({});
    const queue = new SqsPushNotificationQueue(
      { send } as unknown as SQSClient,
      'http://ministack:4566/000000000000/alibe-local-notifications'
    );
    const message = {
      to: 'ExpoPushToken[test-token]',
      title: 'Alibe',
      body: 'Notificações configuradas com sucesso.',
      data: { type: 'test' },
    };

    await queue.publish(message);

    const command = send.mock.calls[0][0] as SendMessageCommand;
    expect(command).toBeInstanceOf(SendMessageCommand);
    expect(command.input).toEqual({
      QueueUrl: 'http://ministack:4566/000000000000/alibe-local-notifications',
      MessageBody: JSON.stringify(message),
    });
  });
});
