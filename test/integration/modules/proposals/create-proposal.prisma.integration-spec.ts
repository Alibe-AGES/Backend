import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaEventRepository } from '../../../../src/modules/events/persistence/prisma-event.repository';
import { type CreateCatalogEventData } from '../../../../src/modules/events/domain/event.repository';

// Opt-in: migrations must already be applied to this dedicated test database.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Proposal creation with PostgreSQL', () => {
  let prisma: PrismaService;
  let events: PrismaEventRepository;
  const userId = randomUUID();
  const groupId = randomUUID();
  const locationId = randomUUID();
  const externalId = `place-${randomUUID()}`;
  const newExternalIds: string[] = [];
  const eventIds: string[] = [];
  const data = (placeId = externalId): CreateCatalogEventData => {
    const id = randomUUID();
    eventIds.push(id);
    return {
      id,
      groupId,
      ownerId: userId,
      location: { externalId: placeId, description: 'Do Google', address: 'Rua do Google' },
      name: 'Café',
      timeslot: new Date('2026-10-17T15:00:00.000Z'),
      image: null,
      budgetStart: '30',
      budgetEnd: '60.126',
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: new Date(),
    };
  };

  beforeAll(async () => {
    const url = new URL(testDatabaseUrl);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
      throw new Error('TEST_DATABASE_URL must point to a local database ending in _test');
    }
    const previousUrl = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = testDatabaseUrl;
      prisma = new PrismaService();
    } finally {
      if (previousUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousUrl;
    }
    await prisma.$connect();
    events = new PrismaEventRepository(prisma);
    await prisma.user.create({
      data: { id: userId, name: 'Ana', email: `${userId}@example.test`, profilePic: null },
    });
    await prisma.group.create({
      data: {
        id: groupId,
        name: 'Grupo teste',
        createdAt: new Date(),
        users: { create: { userId } },
      },
    });
    await prisma.location.create({
      data: {
        id: locationId,
        description: 'Café tranquilo',
        address: 'Rua Padre Chagas, 320',
        manuallyCreated: false,
        externalId,
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.proposalResponse.deleteMany({
        where: { proposal: { eventId: { in: eventIds } } },
      });
      await prisma.proposal.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
      await prisma.location.deleteMany({
        where: { OR: [{ id: locationId }, { externalId: { in: newExternalIds } }] },
      });
      await prisma.userGroup.deleteMany({ where: { groupId } });
      await prisma.group.deleteMany({ where: { id: groupId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('persists all associations and reuses the complete location without mutation or duplication', async () => {
    const original = await prisma.location.findUniqueOrThrow({ where: { id: locationId } });
    const count = await prisma.location.count();
    expect(await events.findGroupMembership(groupId, userId)).toBe(true);
    expect(await events.findCatalogLocation(externalId)).toEqual({
      id: locationId,
      description: original.description,
      address: original.address,
    });
    const input = data();
    const result = await events.createWithCatalogLocation(input);
    expect(result).toMatchObject({
      owner: { id: userId, name: 'Ana', image: null },
      event: {
        id: input.id,
        groupId,
        status: 'pending',
        timeslot: input.timeslot,
        budgetStart: '30.00',
        budgetEnd: '60.13',
      },
      location: { id: locationId, description: original.description, address: original.address },
      myAnswer: 'yes',
    });
    const event = await prisma.event.findUniqueOrThrow({ where: { id: input.id } });
    expect(event.locationId).toBe(locationId);
    expect(event.budgetEnd.toString()).toBe('60.126');
    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id: result.id },
      include: { responses: true },
    });
    expect(proposal).toMatchObject({
      eventId: input.id,
      ownerId: userId,
      createdAt: input.createdAt,
    });
    expect(proposal.responses).toHaveLength(1);
    expect(proposal.responses[0]).toMatchObject({ proposalId: proposal.id, userId, answer: 'yes' });
    expect(await prisma.location.count()).toBe(count);
    expect(await prisma.location.findUniqueOrThrow({ where: { id: locationId } })).toEqual(
      original
    );
  });

  it('returns null for omitted budgets', async () => {
    const input = { ...data(), budgetStart: null, budgetEnd: null };
    const result = await events.createWithCatalogLocation(input);
    expect(result.event).toMatchObject({ budgetStart: null, budgetEnd: null });
  });

  it('rolls back the event when proposal creation fails', async () => {
    const input = { ...data(), ownerId: randomUUID() };
    await expect(events.createWithCatalogLocation(input)).rejects.toThrow();
    expect(await prisma.event.findUnique({ where: { id: input.id } })).toBeNull();
    expect(await prisma.proposal.count({ where: { eventId: input.id } })).toBe(0);
  });

  it('rolls back both event and proposal when response creation fails', async () => {
    const responseCount = await prisma.proposalResponse.count({ where: { userId } });
    const input = data();
    // Invalid enum fails at the third write, after real event and proposal INSERTs.
    input.ownerAnswer = 'invalid' as CreateCatalogEventData['ownerAnswer'];
    await expect(events.createWithCatalogLocation(input)).rejects.toThrow();
    expect(await prisma.event.findUnique({ where: { id: input.id } })).toBeNull();
    expect(await prisma.proposal.count({ where: { eventId: input.id } })).toBe(0);
    expect(await prisma.proposalResponse.count({ where: { userId } })).toBe(responseCount);
  });

  it('stores a place on its first proposal and reuses it on the next one', async () => {
    const placeId = `place-${randomUUID()}`;
    newExternalIds.push(placeId);
    expect(await events.findCatalogLocation(placeId)).toBeNull();

    const first = await events.createWithCatalogLocation(data(placeId));
    const second = await events.createWithCatalogLocation(data(placeId));

    expect(first.location).toEqual({
      id: expect.any(String),
      description: 'Do Google',
      address: 'Rua do Google',
    });
    expect(second.location).toEqual(first.location);
    expect(
      await prisma.location.findMany({ where: { externalId: placeId }, select: { id: true } })
    ).toEqual([{ id: first.location.id }]);
    expect(
      await prisma.location.findUniqueOrThrow({ where: { id: first.location.id } })
    ).toMatchObject({ manuallyCreated: false, externalId: placeId });
  });

  it('rolls back a new place when the proposal fails', async () => {
    const placeId = `place-${randomUUID()}`;
    newExternalIds.push(placeId);
    const input = { ...data(placeId), ownerId: randomUUID() };

    await expect(events.createWithCatalogLocation(input)).rejects.toThrow();

    expect(await prisma.location.count({ where: { externalId: placeId } })).toBe(0);
  });
});
