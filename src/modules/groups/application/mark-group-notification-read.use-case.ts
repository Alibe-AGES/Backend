import { Injectable } from '@nestjs/common';
import { GroupNotificationRepository } from '../domain/group-notification.repository';
import { GroupRepository } from '../domain/group.repository';
import {
  GroupNotificationNotFoundError,
  NotificationGroupAccessDeniedError,
  NotificationGroupNotFoundError,
} from './group-notification.errors';

export interface MarkGroupNotificationReadInput {
  groupId: string;
  notificationId: string;
  userId: string;
}

@Injectable()
export class MarkGroupNotificationReadUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly notifications: GroupNotificationRepository
  ) {}

  async execute(input: MarkGroupNotificationReadInput): Promise<void> {
    const membership = await this.groups.findMembership(input.groupId, input.userId);

    if (membership === null) {
      throw new NotificationGroupNotFoundError('Grupo não encontrado');
    }

    if (!membership) {
      throw new NotificationGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const notificationExists = await this.notifications.markAsRead(
      input.groupId,
      input.notificationId,
      input.userId,
      new Date()
    );

    if (!notificationExists) {
      throw new GroupNotificationNotFoundError('Notificação não encontrada neste grupo');
    }
  }
}
