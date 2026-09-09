import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/group.prisma.repository';

describe('PrismaGroupRepository', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const prisma = {
    group: { create, findUnique },
  } as unknown as PrismaService;
  const repository = new PrismaGroupRepository(prisma);

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
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
