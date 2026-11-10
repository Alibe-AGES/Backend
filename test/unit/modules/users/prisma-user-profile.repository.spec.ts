import type { AuthService } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import type { createAuth } from '../../../../src/modules/auth/auth.config';
import { PrismaUserProfileRepository } from '../../../../src/modules/users/persistence/prisma-user-profile.repository';

type Auth = AuthService<ReturnType<typeof createAuth>>;

describe('PrismaUserProfileRepository', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2026-09-28T12:00:00.000Z');

  it('selects only public user fields and counts only eligible group events', async () => {
    const user = {
      id: userId,
      name: 'Ana Beatriz Silva',
      email: 'ana.silva@example.com',
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      profilePic: 'users/11111111-1111-4111-8111-111111111111/profile-picture.png',
    };
    const findUnique = jest.fn().mockResolvedValue(user);
    const count = jest.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(2);
    const repository = new PrismaUserProfileRepository(
      {
        user: { findUnique },
        event: { count },
      } as unknown as PrismaService,
      {} as Auth
    );

    await expect(repository.findCurrentUserSummary(userId, now)).resolves.toEqual({
      ...user,
      completedEvents: 8,
      eventsInDecision: 2,
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { id: true, name: true, email: true, createdAt: true, profilePic: true },
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
    const repository = new PrismaUserProfileRepository(
      {
        user: { findUnique },
        event: { count },
      } as unknown as PrismaService,
      {} as Auth
    );

    await expect(repository.findCurrentUserSummary(userId, now)).resolves.toBeNull();
    expect(count).not.toHaveBeenCalled();
  });

  it('moves the Expo push token to the current user', async () => {
    const clearPreviousOwner = Symbol('clearPreviousOwner');
    const updateCurrentUser = Symbol('updateCurrentUser');
    const updateMany = jest.fn().mockReturnValue(clearPreviousOwner);
    const update = jest.fn().mockReturnValue(updateCurrentUser);
    const transaction = jest.fn().mockResolvedValue([]);
    const repository = new PrismaUserProfileRepository(
      {
        user: { updateMany, update },
        $transaction: transaction,
      } as unknown as PrismaService,
      {} as Auth
    );

    await repository.updateExpoPushToken(userId, 'ExpoPushToken[test-token]');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        expoPushToken: 'ExpoPushToken[test-token]',
        id: { not: userId },
      },
      data: { expoPushToken: null },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { expoPushToken: 'ExpoPushToken[test-token]' },
    });
    expect(transaction).toHaveBeenCalledWith([clearPreviousOwner, updateCurrentUser]);
  });

  it('finds the Expo push token without selecting other user fields', async () => {
    const findUnique = jest.fn().mockResolvedValue({ expoPushToken: 'ExpoPushToken[test-token]' });
    const repository = new PrismaUserProfileRepository(
      {
        user: { findUnique },
      } as unknown as PrismaService,
      {} as Auth
    );

    await expect(repository.findExpoPushToken(userId)).resolves.toBe('ExpoPushToken[test-token]');
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { expoPushToken: true },
    });
  });

  it('returns null when the user has no Expo push token', async () => {
    const repository = new PrismaUserProfileRepository(
      {
        user: { findUnique: jest.fn().mockResolvedValue({ expoPushToken: null }) },
      } as unknown as PrismaService,
      {} as Auth
    );

    await expect(repository.findExpoPushToken(userId)).resolves.toBeNull();
  });

  describe('password', () => {
    const findCredentialAccount = jest.fn();
    const updatePassword = jest.fn();
    const hash = jest.fn();
    const verify = jest.fn();
    const repository = new PrismaUserProfileRepository(
      {} as PrismaService,
      {
        instance: {
          $context: Promise.resolve({
            internalAdapter: { findCredentialAccount, updatePassword },
            password: { hash, verify },
          }),
        },
      } as unknown as Auth
    );

    beforeEach(() => {
      findCredentialAccount.mockReset();
      updatePassword.mockReset();
      hash.mockReset();
      verify.mockReset();
    });

    it('verifies the password against the stored credential hash', async () => {
      findCredentialAccount.mockResolvedValue({ id: 'account-id', password: 'stored-hash' });
      verify.mockResolvedValue(true);

      await expect(repository.verifyPassword(userId, 'senha-segura')).resolves.toBe(true);

      expect(findCredentialAccount).toHaveBeenCalledWith(userId);
      expect(verify).toHaveBeenCalledWith({ password: 'senha-segura', hash: 'stored-hash' });
    });

    it('does not verify when the user has no credential password', async () => {
      findCredentialAccount.mockResolvedValue(null);

      await expect(repository.verifyPassword(userId, 'senha-segura')).resolves.toBe(false);

      expect(verify).not.toHaveBeenCalled();
    });

    it('stores only the hash of the new password', async () => {
      hash.mockResolvedValue('new-hash');
      updatePassword.mockResolvedValue(undefined);

      await repository.updatePassword(userId, 'nova-senha-segura');

      expect(hash).toHaveBeenCalledWith('nova-senha-segura');
      expect(updatePassword).toHaveBeenCalledWith(userId, 'new-hash');
    });
  it('updates only the name and returns it', async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: userId });
    const update = jest.fn().mockResolvedValue({ name: 'Ana Silva' });
    const repository = new PrismaUserProfileRepository({
      user: { findUnique, update },
    } as unknown as PrismaService);

    await expect(repository.updateName(userId, 'Ana Silva')).resolves.toEqual({
      name: 'Ana Silva',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { name: 'Ana Silva' },
      select: { name: true },
    });
  });

  it('returns null without updating when the user does not exist', async () => {
    const update = jest.fn();
    const repository = new PrismaUserProfileRepository({
      user: { findUnique: jest.fn().mockResolvedValue(null), update },
    } as unknown as PrismaService);

    await expect(repository.updateName(userId, 'Ana Silva')).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
