import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaUserProfileRepository } from '../../../../src/modules/users/persistence/prisma-user-profile.repository';

describe('PrismaUserProfileRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2026-09-28T12:00:00.000Z');

  it('selects only public user fields and counts only eligible group events', async () => {
    const user = {
      id: userId,
      name: 'Ana Beatriz Silva',
      email: 'ana.silva@example.com',
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      image: 'https://example.com/ana.jpg',
    };
    const findUnique = jest.fn().mockResolvedValue(user);
    const count = jest.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    const repository = new PrismaUserProfileRepository({
      user: { findUnique },
      event: { count },
    } as unknown as PrismaService);

    await expect(repository.findCurrentUserSummary(userId, now)).resolves.toEqual({
      ...user,
      completedEvents: 8,
      eventsInDecision: 2,
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true, image: true },
    });
    expect(count).toHaveBeenNthCalledWith(1, {
      where: {
        group: { users: { some: { userId } } },
        status: 'confirmed',
        timeslot: { lt: now },
      },
    });
    expect(count).toHaveBeenNthCalledWith(2, {
      where: {
        group: { users: { some: { userId } } },
        status: 'pending',
        proposals: { some: {}, none: { responses: { some: { userId } } } },
      },
    });
    expect(JSON.stringify(findUnique.mock.calls[0])).not.toContain('password');
  });

  it('returns null without querying event counts when the user does not exist', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const count = jest.fn();
    const repository = new PrismaUserProfileRepository({
      user: { findUnique },
      event: { count },
    } as unknown as PrismaService);

    await expect(repository.findCurrentUserSummary(userId, now)).resolves.toBeNull();
    expect(count).not.toHaveBeenCalled();
  });
});
