import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaEventNotificationRepository } from '../../../../src/modules/events/persistence/prisma-event-notification.repository';

describe('PrismaEventNotificationRepository', () => {
  it('finds group members with tokens while excluding the event creator', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { userId: 'user-2', user: { expoPushToken: 'ExpoPushToken[token-2]' } },
      { userId: 'user-without-token', user: { expoPushToken: null } },
    ]);
    const repository = new PrismaEventNotificationRepository({
      userGroup: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findGroupRecipients('group-id', 'creator-id')).resolves.toEqual([
      { userId: 'user-2', pushToken: 'ExpoPushToken[token-2]' },
    ]);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        groupId: 'group-id',
        userId: { not: 'creator-id' },
        user: { expoPushToken: { not: null } },
      },
      select: {
        userId: true,
        user: { select: { expoPushToken: true } },
      },
    });
  });

  it('returns only members without a final response for pending events in the requested day', async () => {
    const start = new Date('2026-10-18T00:00:00.000Z');
    const end = new Date('2026-10-19T00:00:00.000Z');
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'event-id',
        name: '  Cinema  ',
        groupId: 'group-id',
        proposals: [
          {
            responses: [
              { userId: 'creator-id', answer: 'yes' },
              { userId: 'pending-user', answer: 'pending' },
            ],
          },
        ],
        group: {
          users: [
            { userId: 'creator-id', user: { expoPushToken: 'ExpoPushToken[creator]' } },
            { userId: 'pending-user', user: { expoPushToken: 'ExpoPushToken[pending]' } },
            { userId: 'unanswered-user', user: { expoPushToken: 'ExpoPushToken[unanswered]' } },
          ],
        },
      },
    ]);
    const repository = new PrismaEventNotificationRepository({
      event: { findMany },
    } as unknown as PrismaService);

    await expect(repository.findAttendanceReminderCandidates(start, end)).resolves.toEqual([
      {
        eventId: 'event-id',
        eventName: 'Cinema',
        groupId: 'group-id',
        recipients: [
          { userId: 'pending-user', pushToken: 'ExpoPushToken[pending]' },
          { userId: 'unanswered-user', pushToken: 'ExpoPushToken[unanswered]' },
        ],
      },
    ]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'pending', timeslot: { gte: start, lt: end } },
      })
    );
  });
});
