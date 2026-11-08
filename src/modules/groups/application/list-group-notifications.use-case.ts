import { Injectable } from '@nestjs/common';
import { GroupNotificationRepository } from '../domain/group-notification.repository';
import { GroupRepository } from '../domain/group.repository';
import {
  NotificationGroupAccessDeniedError,
  NotificationGroupNotFoundError,
} from './group-notification.errors';

export interface ListGroupNotificationsInput {
  groupId: string;
  userId: string;
  page: number;
  limit: number;
}

@Injectable()
export class ListGroupNotificationsUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly notifications: GroupNotificationRepository
  ) {}

  async execute(input: ListGroupNotificationsInput) {
    const membership = await this.groups.findMembership(input.groupId, input.userId);

    if (membership === null) {
      throw new NotificationGroupNotFoundError('Grupo não encontrado');
    }

    if (!membership) {
      throw new NotificationGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    return this.notifications.findUnreadPage(input.groupId, input.userId, input.page, input.limit);
  }
}
