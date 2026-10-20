import {
  GroupNotificationNotFoundError,
  NotificationGroupAccessDeniedError,
  NotificationGroupNotFoundError,
} from '../../../../src/modules/groups/application/group-notification.errors';
import { MarkAllGroupNotificationsReadUseCase } from '../../../../src/modules/groups/application/mark-all-group-notifications-read.use-case';
import { MarkGroupNotificationReadUseCase } from '../../../../src/modules/groups/application/mark-group-notification-read.use-case';
import { GroupNotificationRepository } from '../../../../src/modules/groups/domain/group-notification.repository';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

describe('Mark group notifications as read', () => {
  const groupId = 'group-id';
  const userId = 'user-id';
  const notificationId = 'notification-id';

  it('marks all current group notifications for the authenticated member', async () => {
    const findMembership = jest.fn().mockResolvedValue(true);
    const markAllAsRead = jest.fn().mockResolvedValue(undefined);
    const useCase = new MarkAllGroupNotificationsReadUseCase(
      { findMembership } as unknown as GroupRepository,
      { markAllAsRead } as unknown as GroupNotificationRepository
    );

    await expect(useCase.execute({ groupId, userId })).resolves.toBeUndefined();

    expect(markAllAsRead).toHaveBeenCalledWith(groupId, userId, expect.any(Date));
  });

  it('marks one notification and remains idempotent at the application boundary', async () => {
    const markAsRead = jest.fn().mockResolvedValue(true);
    const useCase = new MarkGroupNotificationReadUseCase(
      { findMembership: jest.fn().mockResolvedValue(true) } as unknown as GroupRepository,
      { markAsRead } as unknown as GroupNotificationRepository
    );

    await expect(useCase.execute({ groupId, notificationId, userId })).resolves.toBeUndefined();

    expect(markAsRead).toHaveBeenCalledWith(groupId, notificationId, userId, expect.any(Date));
  });

  it('rejects a notification that does not belong to the requested group', async () => {
    const useCase = new MarkGroupNotificationReadUseCase(
      { findMembership: jest.fn().mockResolvedValue(true) } as unknown as GroupRepository,
      { markAsRead: jest.fn().mockResolvedValue(false) } as unknown as GroupNotificationRepository
    );

    await expect(useCase.execute({ groupId, notificationId, userId })).rejects.toBeInstanceOf(
      GroupNotificationNotFoundError
    );
  });

  it.each([
    [null, NotificationGroupNotFoundError],
    [false, NotificationGroupAccessDeniedError],
  ])('protects both read operations when membership is %p', async (membership, errorType) => {
    const notifications = {
      markAllAsRead: jest.fn(),
      markAsRead: jest.fn(),
    } as unknown as GroupNotificationRepository;
    const groups = {
      findMembership: jest.fn().mockResolvedValue(membership),
    } as unknown as GroupRepository;

    const markAll = new MarkAllGroupNotificationsReadUseCase(groups, notifications);
    const markOne = new MarkGroupNotificationReadUseCase(groups, notifications);

    await expect(markAll.execute({ groupId, userId })).rejects.toBeInstanceOf(errorType);
    await expect(markOne.execute({ groupId, notificationId, userId })).rejects.toBeInstanceOf(
      errorType
    );
    expect(notifications.markAllAsRead).not.toHaveBeenCalled();
    expect(notifications.markAsRead).not.toHaveBeenCalled();
  });
});
