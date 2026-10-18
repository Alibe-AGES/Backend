import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupNotificationRepository } from '../../../../src/modules/groups/persistence/prisma-group-notification.repository';

describe('PrismaGroupNotificationRepository', () => {
  it('returns only unread notifications in stable newest-first order', async () => {
    const authorId = '11111111-1111-4111-8111-111111111111';
    const createdAt = new Date('2026-10-18T18:00:00.000Z');
    const count = jest.fn().mockResolvedValue(15);
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'notification-id',
        type: 'createdEvent',
        message: `\${user:${authorId}} criou o evento "Cinema" para o dia 18/10/2026.`,
        createdAt,
        eventId: 'event-id',
      },
    ]);
    const findUsers = jest.fn().mockResolvedValue([{ id: authorId, name: 'Ana Souza' }]);
    const $transaction = jest.fn((operations: Array<Promise<unknown>>) => Promise.all(operations));
    const repository = new PrismaGroupNotificationRepository({
      groupNotification: { count, findMany },
      user: { findMany: findUsers },
      $transaction,
    } as unknown as PrismaService);

    await expect(repository.findUnreadPage('group-id', 'user-id', 2, 7)).resolves.toEqual({
      items: [
        {
          id: 'notification-id',
          type: 'createdEvent',
          message: 'Ana Souza criou o evento "Cinema" para o dia 18/10/2026.',
          createdAt,
          eventId: 'event-id',
        },
      ],
      page: 2,
      limit: 7,
      total: 15,
      totalPages: 3,
    });

    const where = {
      groupId: 'group-id',
      reads: { none: { userId: 'user-id' } },
    };
    expect(count).toHaveBeenCalledWith({ where });
    expect(findMany).toHaveBeenCalledWith({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 7,
      take: 7,
      select: {
        id: true,
        type: true,
        message: true,
        createdAt: true,
        eventId: true,
      },
    });
    expect(findUsers).toHaveBeenCalledWith({
      where: { id: { in: [authorId] } },
      select: { id: true, name: true },
    });
  });

  it('resolves multiple user references so match notifications are ready', async () => {
    const firstId = '11111111-1111-4111-8111-111111111111';
    const secondId = '22222222-2222-4222-8222-222222222222';
    const items = [
      {
        id: 'notification-id',
        type: 'match',
        message: `\${user:${firstId}} e \${user:${secondId}} deram match.`,
        createdAt: new Date('2026-10-18T18:00:00.000Z'),
        eventId: 'event-id',
      },
    ];
    const repository = new PrismaGroupNotificationRepository({
      groupNotification: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue(items),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: firstId, name: 'Ana' },
          { id: secondId, name: 'Bruno' },
        ]),
      },
      $transaction: jest.fn((operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as PrismaService);

    const result = await repository.findUnreadPage('group-id', 'user-id', 1, 7);

    expect(result.items[0].message).toBe('Ana e Bruno deram match.');
  });

  it('creates read records for every currently unread notification', async () => {
    const readAt = new Date('2026-10-18T19:00:00.000Z');
    const findMany = jest
      .fn()
      .mockResolvedValue([{ id: 'notification-1' }, { id: 'notification-2' }]);
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const repository = repositoryWithCallbackTransaction({
      groupNotification: { findMany },
      groupNotificationRead: { createMany },
    });

    await expect(repository.markAllAsRead('group-id', 'user-id', readAt)).resolves.toBeUndefined();

    expect(findMany).toHaveBeenCalledWith({
      where: {
        groupId: 'group-id',
        reads: { none: { userId: 'user-id' } },
      },
      select: { id: true },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { notificationId: 'notification-1', userId: 'user-id', readAt },
        { notificationId: 'notification-2', userId: 'user-id', readAt },
      ],
      skipDuplicates: true,
    });
  });

  it('does not write when every notification is already read', async () => {
    const createMany = jest.fn();
    const repository = repositoryWithCallbackTransaction({
      groupNotification: { findMany: jest.fn().mockResolvedValue([]) },
      groupNotificationRead: { createMany },
    });

    await repository.markAllAsRead('group-id', 'user-id', new Date());

    expect(createMany).not.toHaveBeenCalled();
  });

  it('upserts one user read without affecting other group members', async () => {
    const readAt = new Date('2026-10-18T19:00:00.000Z');
    const findFirst = jest.fn().mockResolvedValue({ id: 'notification-id' });
    const upsert = jest.fn().mockResolvedValue({});
    const repository = repositoryWithCallbackTransaction({
      groupNotification: { findFirst },
      groupNotificationRead: { upsert },
    });

    await expect(
      repository.markAsRead('group-id', 'notification-id', 'user-id', readAt)
    ).resolves.toBe(true);

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-id', groupId: 'group-id' },
      select: { id: true },
    });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        notificationId_userId: { notificationId: 'notification-id', userId: 'user-id' },
      },
      create: { notificationId: 'notification-id', userId: 'user-id', readAt },
      update: { readAt },
    });
  });

  it('returns false when the notification is outside the requested group', async () => {
    const upsert = jest.fn();
    const repository = repositoryWithCallbackTransaction({
      groupNotification: { findFirst: jest.fn().mockResolvedValue(null) },
      groupNotificationRead: { upsert },
    });

    await expect(
      repository.markAsRead('group-id', 'notification-id', 'user-id', new Date())
    ).resolves.toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});

function repositoryWithCallbackTransaction(transaction: object): PrismaGroupNotificationRepository {
  return new PrismaGroupNotificationRepository({
    $transaction: jest.fn((callback: (value: object) => unknown) => callback(transaction)),
  } as unknown as PrismaService);
}
