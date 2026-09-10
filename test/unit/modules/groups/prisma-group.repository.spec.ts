import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/group.prisma.repository';

describe('PrismaGroupRepository', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const inviteLinkCreate = jest.fn();
  const inviteLinkFindFirst = jest.fn();
  const prisma = {
    group: { create, findUnique },
    inviteLink: { create: inviteLinkCreate, findFirst: inviteLinkFindFirst },
  } as unknown as PrismaService;
  const repository = new PrismaGroupRepository(prisma);

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
    inviteLinkCreate.mockReset();
    inviteLinkFindFirst.mockReset();
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
});
