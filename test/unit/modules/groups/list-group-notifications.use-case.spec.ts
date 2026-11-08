import { ListGroupNotificationsUseCase } from '../../../../src/modules/groups/application/list-group-notifications.use-case';
import {
  NotificationGroupAccessDeniedError,
  NotificationGroupNotFoundError,
} from '../../../../src/modules/groups/application/group-notification.errors';
import { GroupNotificationRepository } from '../../../../src/modules/groups/domain/group-notification.repository';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

describe('ListGroupNotificationsUseCase', () => {
  const input = { groupId: 'group-id', userId: 'user-id', page: 2, limit: 7 };
  const page = { items: [], page: 2, limit: 7, total: 8, totalPages: 2 };

  it('returns the requested page when the user belongs to the group', async () => {
    const findMembership = jest.fn().mockResolvedValue(true);
    const findUnreadPage = jest.fn().mockResolvedValue(page);
    const useCase = new ListGroupNotificationsUseCase(
      { findMembership } as unknown as GroupRepository,
      { findUnreadPage } as unknown as GroupNotificationRepository
    );

    await expect(useCase.execute(input)).resolves.toBe(page);
    expect(findMembership).toHaveBeenCalledWith(input.groupId, input.userId);
    expect(findUnreadPage).toHaveBeenCalledWith(input.groupId, input.userId, 2, 7);
  });

  it('distinguishes a missing group from denied membership', async () => {
    const notifications = {
      findUnreadPage: jest.fn(),
    } as unknown as GroupNotificationRepository;
    const missingGroupUseCase = new ListGroupNotificationsUseCase(
      { findMembership: jest.fn().mockResolvedValue(null) } as unknown as GroupRepository,
      notifications
    );
    const deniedUseCase = new ListGroupNotificationsUseCase(
      { findMembership: jest.fn().mockResolvedValue(false) } as unknown as GroupRepository,
      notifications
    );

    await expect(missingGroupUseCase.execute(input)).rejects.toBeInstanceOf(
      NotificationGroupNotFoundError
    );
    await expect(deniedUseCase.execute(input)).rejects.toBeInstanceOf(
      NotificationGroupAccessDeniedError
    );
    expect(notifications.findUnreadPage).not.toHaveBeenCalled();
  });
});
