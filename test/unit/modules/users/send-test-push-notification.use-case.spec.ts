import {
  PushTokenNotRegisteredError,
  SendTestPushNotificationUseCase,
} from '../../../../src/modules/users/application/send-test-push-notification.use-case';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';
import { PushNotificationQueue } from '../../../../src/shared/messaging/push-notification-queue';

describe('SendTestPushNotificationUseCase', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('publishes a test notification to the token owned by the user', async () => {
    const findExpoPushToken = jest.fn().mockResolvedValue('ExpoPushToken[test-token]');
    const publish = jest.fn().mockResolvedValue(undefined);
    const useCase = new SendTestPushNotificationUseCase(
      { findExpoPushToken } as unknown as UserProfileRepository,
      { publish } as PushNotificationQueue
    );

    await useCase.execute(userId);

    expect(findExpoPushToken).toHaveBeenCalledWith(userId);
    expect(publish).toHaveBeenCalledWith({
      to: 'ExpoPushToken[test-token]',
      title: 'Alibe',
      body: 'Notificações configuradas com sucesso.',
      data: { type: 'test' },
    });
  });

  it('does not enqueue a message when the user has no token', async () => {
    const publish = jest.fn();
    const useCase = new SendTestPushNotificationUseCase(
      { findExpoPushToken: jest.fn().mockResolvedValue(null) } as unknown as UserProfileRepository,
      { publish } as PushNotificationQueue
    );

    await expect(useCase.execute(userId)).rejects.toBeInstanceOf(PushTokenNotRegisteredError);
    expect(publish).not.toHaveBeenCalled();
  });
});
