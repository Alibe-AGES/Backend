import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/group.prisma.repository';

describe('PrismaGroupRepository ownership', () => {
  const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ownerId = '11111111-1111-4111-8111-111111111111';
  const memberId = '22222222-2222-4222-8222-222222222222';
  const otherId = '33333333-3333-4333-8333-333333333333';
  let repository: PrismaGroupRepository;
  let queryRaw: jest.Mock;
  let findUnique: jest.Mock;
  let update: jest.Mock;
  let deleteMany: jest.Mock;
  let findMany: jest.Mock;
  let upsert: jest.Mock;

  beforeEach(() => {
    queryRaw = jest.fn().mockResolvedValue([{ ownerId, profilePic: 'old.png' }]);
    findUnique = jest.fn();
    update = jest.fn().mockResolvedValue({
      id: groupId,
      name: 'Atualizado',
      profilePic: null,
      createdAt: new Date(),
    });
    deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    findMany = jest.fn().mockResolvedValue([{ userId: memberId }, { userId: otherId }]);
    upsert = jest.fn().mockResolvedValue({ userId: memberId, groupId });
    const transaction = {
      $queryRaw: queryRaw,
      group: { findUnique, update },
      userGroup: { deleteMany, findMany, upsert },
    };
    repository = new PrismaGroupRepository({
      ...transaction,
      $transaction: jest.fn(async (callback: (value: typeof transaction) => Promise<unknown>) =>
        callback(transaction)
      ),
    } as unknown as PrismaService);
  });

  it('returns persisted ownership for authorization and null for a missing group', async () => {
    findUnique
      .mockResolvedValueOnce({ ownerId, profilePic: 'old.png' })
      .mockResolvedValueOnce(null);
    await expect(repository.findManagementState(groupId)).resolves.toEqual({
      ownerId,
      profilePic: 'old.png',
    });
    await expect(repository.findManagementState(groupId)).resolves.toBeNull();
  });

  it('updates only after checking the locked owner and returns the previous image for cleanup', async () => {
    const result = await repository.updateOwned(groupId, ownerId, {
      name: 'Atualizado',
      profilePic: null,
    });
    expect(result.group.name).toBe('Atualizado');
    expect(result.group.profilePic).toBeNull();
    expect(result.previousImageKey).toBe('old.png');
    expect(update).toHaveBeenCalledWith({
      where: { id: groupId },
      data: { name: 'Atualizado', profilePic: null },
    });
    expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]);
  });

  it.each([
    { state: [], reason: 'not-found' },
    { state: [{ ownerId: otherId, profilePic: null }], reason: 'forbidden' },
  ])(
    'blocks editing before persistence when authorization fails: $reason',
    async ({ state, reason }) => {
      queryRaw.mockResolvedValue(state);
      await expect(
        repository.updateOwned(groupId, ownerId, { name: 'Proibido' })
      ).rejects.toMatchObject({ reason });
      expect(update).not.toHaveBeenCalled();
    }
  );

  it.each([
    { state: [], reason: 'not-found' },
    { state: [{ ownerId: otherId, profilePic: null }], reason: 'forbidden' },
  ])(
    'blocks member removal before deleting when authorization fails: $reason',
    async ({ state, reason }) => {
      queryRaw.mockResolvedValue(state);
      await expect(repository.removeMember(groupId, memberId, ownerId)).rejects.toMatchObject({
        reason,
      });
      expect(deleteMany).not.toHaveBeenCalled();
    }
  );

  it('returns false for a self-removal from a group that no longer exists', async () => {
    queryRaw.mockResolvedValue([]);
    await expect(repository.removeMember(groupId, memberId)).resolves.toBe(false);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('returns false for an absent participant without changing ownership', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.removeMember(groupId, memberId, ownerId)).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('removes an ordinary member only from the selected group and preserves its owner', async () => {
    await expect(repository.removeMember(groupId, memberId, ownerId)).resolves.toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({ where: { groupId, userId: memberId } });
    expect(update).not.toHaveBeenCalled();
  });

  it('selects a remaining member as owner after removing the current owner', async () => {
    await expect(repository.removeMember(groupId, ownerId, ownerId)).resolves.toBe(true);
    expect(queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      deleteMany.mock.invocationCallOrder[0]
    );
    const selectedOwner = update.mock.calls[0][0].data.ownerId;
    expect([memberId, otherId]).toContain(selectedOwner);
    expect(update).toHaveBeenCalledWith({
      where: { id: groupId },
      data: { ownerId: selectedOwner },
    });
  });

  it('keeps the group ownerless when its last member leaves', async () => {
    findMany.mockResolvedValue([]);
    await expect(repository.removeMember(groupId, ownerId)).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: groupId }, data: { ownerId: null } });
  });

  it('rejects joining a nonexistent group without creating a membership', async () => {
    queryRaw.mockResolvedValue([]);
    await expect(repository.addMember(groupId, memberId)).rejects.toMatchObject({
      reason: 'not-found',
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('preserves the existing owner when another member joins', async () => {
    await repository.addMember(groupId, memberId);
    expect(upsert).toHaveBeenCalledWith({
      where: { userId_groupId: { userId: memberId, groupId } },
      update: {},
      create: { userId: memberId, groupId },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('assigns ownership to the first member joining an ownerless group', async () => {
    queryRaw.mockResolvedValue([{ ownerId: null, profilePic: null }]);
    await repository.addMember(groupId, memberId);
    expect(update).toHaveBeenCalledWith({ where: { id: groupId }, data: { ownerId: memberId } });
  });
});

describe('PrismaGroupRepository', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const inviteLinkCreate = jest.fn();
  const inviteLinkFindFirst = jest.fn();
  const inviteLinkFindUnique = jest.fn();
  const userGroupUpsert = jest.fn();
  const prisma = {
    $transaction: jest.fn((callback: (transaction: unknown) => unknown) => callback(prisma)),
    $queryRaw: jest.fn().mockResolvedValue([{ ownerId: 'owner-id', profilePic: null }]),
    group: { create, findUnique },
    inviteLink: {
      create: inviteLinkCreate,
      findFirst: inviteLinkFindFirst,
      findUnique: inviteLinkFindUnique,
    },
    userGroup: { upsert: userGroupUpsert },
  } as unknown as PrismaService;
  const repository = new PrismaGroupRepository(prisma);

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
    inviteLinkCreate.mockReset();
    inviteLinkFindFirst.mockReset();
    inviteLinkFindUnique.mockReset();
    userGroupUpsert.mockReset();
  });

  it('loads all members and preserves full-day records alongside unsorted UTC intervals', async () => {
    const groupId = 'group-id';
    const userId = 'current-user';
    const date = '2000-02-29';
    findUnique.mockResolvedValue({
      users: [
        { user: { id: 'no-records', name: 'Bruno', profilePic: null, availabilities: [] } },
        {
          user: {
            id: userId,
            name: 'Ana',
            profilePic: 'key',
            availabilities: [
              { timeslotStart: null, timeslotEnd: null },
              {
                timeslotStart: new Date(`${date}T18:00:00.000Z`),
                timeslotEnd: new Date(`${date}T23:59:00.000Z`),
              },
              {
                timeslotStart: new Date(`${date}T00:05:00.000Z`),
                timeslotEnd: new Date(`${date}T03:00:00.000Z`),
              },
            ],
          },
        },
        {
          user: {
            id: 'full-day',
            name: 'Camila',
            profilePic: null,
            availabilities: [{ timeslotStart: null, timeslotEnd: null }],
          },
        },
      ],
    });
    await expect(repository.findAvailabilitiesByDate(groupId, date, userId)).resolves.toEqual({
      date,
      users: [
        {
          id: 'no-records',
          name: 'Bruno',
          profilePic: null,
          availableAllDay: false,
          intervals: [],
        },
        {
          id: userId,
          name: 'Ana',
          profilePic: 'key',
          availableAllDay: true,
          intervals: [
            ['18:00', '23:59'],
            ['00:05', '03:00'],
          ],
        },
        { id: 'full-day', name: 'Camila', profilePic: null, availableAllDay: true, intervals: [] },
      ],
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: groupId, users: { some: { userId } } },
      select: {
        users: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                profilePic: true,
                availabilities: {
                  where: { groupId, date: new Date(`${date}T00:00:00.000Z`) },
                  select: { timeslotStart: true, timeslotEnd: true },
                },
              },
            },
          },
        },
      },
    });
  });

  it('creates and maps a group', async () => {
    const createdAt = new Date('2026-08-30T00:00:00.000Z');
    const userId = '11111111-1111-4111-8111-111111111111';
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Group of friends',
      profilePic: 'groups/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: createdAt,
      creatorId: userId,
    };

    create.mockResolvedValue({ ...data, createdAt });

    const result = await repository.create(data);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: data.id,
        name: data.name,
        profilePic: data.profilePic,
        createdAt: data.createdAt,
        ownerId: data.creatorId,
        users: {
          create: {
            userId: data.creatorId,
          },
        },
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: data.id,
        name: data.name,
        profilePic: data.profilePic,
        createdAt,
      })
    );
  });

  it('finds and maps a group', async () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Group of friends',
      profilePic: 'groups/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    };
    findUnique.mockResolvedValue(row);

    await expect(repository.findById(row.id)).resolves.toEqual(expect.objectContaining(row));
    expect(findUnique).toHaveBeenCalledWith({ where: { id: row.id } });
  });

  it('returns null when group does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.findById('550e8400-e29b-41d4-a716-446655440000')).resolves.toBeNull();
  });

  it('checks whether a user belongs to a group', async () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '11111111-1111-4111-8111-111111111111';
    findUnique.mockResolvedValue({ users: [{ userId }] });

    await expect(repository.findMembership(groupId, userId)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: groupId },
      select: {
        users: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });
  });

  it('reports missing membership and missing groups', async () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '11111111-1111-4111-8111-111111111111';
    findUnique.mockResolvedValueOnce({ users: [] }).mockResolvedValueOnce(null);

    await expect(repository.findMembership(groupId, userId)).resolves.toBe(false);
    await expect(repository.findMembership(groupId, userId)).resolves.toBeNull();
  });

  it('creates and maps an invite link', async () => {
    const data = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      token: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      validity: new Date('2026-09-16T00:00:00.000Z'),
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      groupId: '550e8400-e29b-41d4-a716-446655440000',
    };

    inviteLinkCreate.mockResolvedValue(data);

    const result = await repository.createInviteLink(data);

    expect(inviteLinkCreate).toHaveBeenCalledWith({ data });
    expect(result).toEqual(expect.objectContaining(data));
  });

  it('finds and maps the latest invite link for a group', async () => {
    const row = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      token: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      validity: new Date('2026-09-16T00:00:00.000Z'),
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      groupId: '550e8400-e29b-41d4-a716-446655440000',
    };

    inviteLinkFindFirst.mockResolvedValue(row);

    await expect(repository.findLatestInviteLinkByGroupId(row.groupId)).resolves.toEqual(
      expect.objectContaining(row)
    );
    expect(inviteLinkFindFirst).toHaveBeenCalledWith({
      where: { groupId: row.groupId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns null when no invite link exists for the group', async () => {
    inviteLinkFindFirst.mockResolvedValue(null);

    await expect(
      repository.findLatestInviteLinkByGroupId('550e8400-e29b-41d4-a716-446655440000')
    ).resolves.toBeNull();
  });

  it('finds and maps an invite link by token', async () => {
    const row = {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      token: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      validity: new Date('2026-09-16T00:00:00.000Z'),
      createdAt: new Date('2026-09-09T00:00:00.000Z'),
      groupId: '550e8400-e29b-41d4-a716-446655440000',
    };
    inviteLinkFindUnique.mockResolvedValue(row);

    await expect(repository.findInviteLinkByToken(row.token)).resolves.toEqual(
      expect.objectContaining(row)
    );
    expect(inviteLinkFindUnique).toHaveBeenCalledWith({ where: { token: row.token } });
  });

  it('returns null when no invite link matches the token', async () => {
    inviteLinkFindUnique.mockResolvedValue(null);

    await expect(repository.findInviteLinkByToken('unknown-token')).resolves.toBeNull();
  });

  it('adds a member to a group', async () => {
    const groupId = '550e8400-e29b-41d4-a716-446655440000';
    const userId = '11111111-1111-4111-8111-111111111111';

    await repository.addMember(groupId, userId);

    expect(userGroupUpsert).toHaveBeenCalledWith({
      where: { userId_groupId: { userId, groupId } },
      update: {},
      create: { userId, groupId },
    });
  });

  it('finds group details with users and the next future event', async () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Group of friends',
      profilePic: 'groups/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    };
    const participant = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ana Souza',
      profilePic: 'users/ana/image.jpg',
    };
    const event = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Dinner',
      timeslot: new Date('2026-09-10T20:00:00.000Z'),
      status: 'confirmed',
    };
    findUnique.mockResolvedValue({
      ...row,
      users: [{ user: participant }],
      events: [event],
    });

    await expect(repository.findDetailsById(row.id)).resolves.toEqual({
      ...row,
      participants: [participant],
      nextEvent: event,
    });

    const [query] = findUnique.mock.calls.at(-1);
    expect(query.where).toEqual({ id: row.id });
    expect(query.include.users).toEqual({
      select: {
        user: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });
    expect(query.include.events).toEqual({
      where: { timeslot: { gte: expect.any(Date) } },
      orderBy: { timeslot: 'asc' },
      take: 1,
      select: { id: true, name: true, timeslot: true, status: true },
    });
  });

  it('returns group details without a next event', async () => {
    findUnique.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Group of friends',
      profilePic: null,
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
      users: [],
      events: [],
    });

    await expect(
      repository.findDetailsById('550e8400-e29b-41d4-a716-446655440000')
    ).resolves.toEqual(expect.objectContaining({ participants: [], nextEvent: null }));
  });
});
