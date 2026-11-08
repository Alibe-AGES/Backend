import { GroupPushNotificationService } from '../../../../src/modules/events/application/group-push-notification.service';
import { EventNotificationRepository } from '../../../../src/modules/events/domain/event-notification.repository';
import { PushNotificationQueue } from '../../../../src/shared/messaging/push-notification-queue';

describe('GroupPushNotificationService', () => {
  const groupId = '33333333-3333-4333-8333-333333333333';
  const creatorId = '11111111-1111-4111-8111-111111111111';

  it('resolves group recipients and enqueues one message for each token', async () => {
    const findGroupRecipients = jest.fn().mockResolvedValue([
      { userId: 'user-2', pushToken: 'ExpoPushToken[token-2]' },
      { userId: 'user-3', pushToken: 'ExpoPushToken[token-3]' },
    ]);
    const publish = jest.fn().mockResolvedValue(undefined);
    const service = new GroupPushNotificationService(
      { findGroupRecipients } as unknown as EventNotificationRepository,
      { publish } as PushNotificationQueue
    );
    const message = {
      title: 'Novo encontro no grupo',
      body: 'Um novo encontro foi criado: Cinema.',
      data: { type: 'new_event', eventId: 'event-id', groupId },
    };

    await expect(service.sendToGroup(groupId, message, creatorId)).resolves.toEqual({
      attempted: 2,
      sent: 2,
      failed: 0,
    });

    expect(findGroupRecipients).toHaveBeenCalledWith(groupId, creatorId);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish).toHaveBeenNthCalledWith(1, {
      to: 'ExpoPushToken[token-2]',
      ...message,
    });
    expect(publish).toHaveBeenNthCalledWith(2, {
      to: 'ExpoPushToken[token-3]',
      ...message,
    });
  });

  it('reports individual queue failures without stopping the other recipients', async () => {
    const publish = jest
      .fn()
      .mockRejectedValueOnce(new Error('SQS unavailable'))
      .mockResolvedValueOnce(undefined);
    const service = new GroupPushNotificationService(
      {} as EventNotificationRepository,
      { publish } as PushNotificationQueue
    );

    await expect(
      service.sendToRecipients(
        [
          { userId: 'user-2', pushToken: 'ExpoPushToken[token-2]' },
          { userId: 'user-3', pushToken: 'ExpoPushToken[token-3]' },
        ],
        { title: 'Lembrete', body: 'Confirme sua presença.' }
      )
    ).resolves.toEqual({ attempted: 2, sent: 1, failed: 1 });
  });
});
