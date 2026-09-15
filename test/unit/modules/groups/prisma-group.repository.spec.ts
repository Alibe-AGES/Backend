import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/group.prisma.repository';

describe('PrismaGroupRepository', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const inviteLinkCreate = jest.fn();
  const inviteLinkFindFirst = jest.fn();
  const inviteLinkFindUnique = jest.fn();
  const userGroupUpsert = jest.fn();
  const prisma = {
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
        users: {
          create: {
            userId: data.creatorId,
          },
        },
      },
    });

    expect(result).toEqual(expect.objectContaining({ ...data, createdAt }));
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
