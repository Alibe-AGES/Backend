import { Injectable } from '@nestjs/common';
import { PushNotificationQueue } from '../../../shared/messaging/push-notification-queue';
import { UserProfileRepository } from '../domain/user-profile.repository';

export class PushTokenNotRegisteredError extends Error {}

@Injectable()
export class SendTestPushNotificationUseCase {
  constructor(
    private readonly users: UserProfileRepository,
    private readonly notifications: PushNotificationQueue
  ) {}

  async execute(userId: string): Promise<void> {
    const token = await this.users.findExpoPushToken(userId);

    if (!token) {
      throw new PushTokenNotRegisteredError('O usuário ainda não possui um Expo Push Token');
    }

    await this.notifications.publish({
      to: token,
      title: 'Alibe',
      body: 'Notificações configuradas com sucesso.',
      data: { type: 'test' },
    });
  }
}
