import { Injectable } from '@nestjs/common';
import { GroupNotificationRepository } from '../domain/group-notification.repository';
import { GroupRepository } from '../domain/group.repository';
import {
  NotificationGroupAccessDeniedError,
  NotificationGroupNotFoundError,
} from './group-notification.errors';

export interface MarkAllGroupNotificationsReadInput {
  groupId: string;
  userId: string;
}

@Injectable()
export class MarkAllGroupNotificationsReadUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly notifications: GroupNotificationRepository
  ) {}

  async execute(input: MarkAllGroupNotificationsReadInput): Promise<void> {
    const membership = await this.groups.findMembership(input.groupId, input.userId);

    if (membership === null) {
      throw new NotificationGroupNotFoundError('Grupo não encontrado');
    }

    if (!membership) {
      throw new NotificationGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    await this.notifications.markAllAsRead(input.groupId, input.userId, new Date());
  }
}
