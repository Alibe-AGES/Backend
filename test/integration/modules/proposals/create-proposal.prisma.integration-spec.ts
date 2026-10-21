import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import type { CreateSuggestionData } from '../../../../src/modules/proposals/domain/proposal.repository';
import { PrismaProposalRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal.repository';
import { PrismaProposalResponseRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal-response.repository';

// Opt-in: migrations must already be applied to this dedicated test database.
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;

describeDatabase('Proposal suggestions and matches with PostgreSQL', () => {
  let prisma: PrismaService;
  let proposals: PrismaProposalRepository;
  let responses: PrismaProposalResponseRepository;
  const ownerId = randomUUID();
  const firstMemberId = randomUUID();
  const secondMemberId = randomUUID();
  const userIds = [ownerId, firstMemberId, secondMemberId];
  const groupId = randomUUID();
  const soloGroupId = randomUUID();
  const groupIds = [groupId, soloGroupId];
  const locationId = randomUUID();
  const externalId = `place-${randomUUID()}`;
  const newExternalIds: string[] = [];
  const newLocation = (placeId: string) => ({
    id: randomUUID(),
    externalId: placeId,
    name: 'Café',
    description: 'Do Google',
    address: 'Rua do Google',
    openingHours: [],
    rating: null,
    phoneNumber: null,
    website: null,
    priceRange: { start: null, end: null, currencyCode: null },
    image: null,
    manuallyCreated: false,
  });
  const data = (overrides: Partial<CreateSuggestionData> = {}): CreateSuggestionData => ({
    id: randomUUID(),
    groupId,
    ownerId,
    location: { kind: 'existing', id: locationId },
    name: 'Café',
    createdAt: new Date(),
    ...overrides,
  });
  const accept = (proposalId: string, userId: string) =>
    responses.create({ proposalId, userId, answer: 'yes', createdAt: new Date() });

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
    proposals = new PrismaProposalRepository(prisma);
    responses = new PrismaProposalResponseRepository(prisma);
    await prisma.user.createMany({
      data: userIds.map((id) => ({ id, name: 'Ana', email: `${id}@example.test` })),
    });
    await prisma.group.create({
      data: {
        id: groupId,
        name: 'Grupo teste',
        createdAt: new Date(),
        users: { create: userIds.map((userId) => ({ userId })) },
      },
    });
    await prisma.group.create({
      data: {
        id: soloGroupId,
        name: 'Grupo solo',
        createdAt: new Date(),
        users: { create: { userId: ownerId } },
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
      await prisma.groupNotification.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.proposalResponse.deleteMany({
        where: { proposal: { groupId: { in: groupIds } } },
      });
      await prisma.proposal.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.location.deleteMany({
        where: { OR: [{ id: locationId }, { externalId: { in: newExternalIds } }] },
      });
      await prisma.userGroup.deleteMany({ where: { groupId: { in: groupIds } } });
      await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } finally {
      await prisma.$disconnect();
    }
  });

  it('persists the suggestion with the owner acceptance and no event', async () => {
    const original = await prisma.location.findUniqueOrThrow({ where: { id: locationId } });
    const eventCount = await prisma.event.count();
    expect(await proposals.findGroupMembership(groupId, ownerId)).toBe(true);
    expect(await proposals.findCatalogLocation(externalId)).toEqual({
      id: locationId,
      externalId,
      name: null,
      description: original.description,
      address: original.address,
      openingHours: [],
      rating: null,
      phoneNumber: null,
      website: null,
      priceRange: { start: null, end: null, currencyCode: null },
      image: null,
      manuallyCreated: false,
    });

    const input = data();
    const result = await proposals.createSuggestion(input);

    expect(result).toMatchObject({
      id: input.id,
      type: 'suggestion',
      groupId,
      owner: { id: ownerId, name: 'Ana', image: null },
      location: { id: locationId },
      myAnswer: 'yes',
      matched: false,
    });
    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id: input.id },
      include: { responses: true },
    });
    expect(proposal).toMatchObject({
      type: 'suggestion',
      eventId: null,
      groupId,
      locationId,
      matchedAt: null,
    });
    expect(proposal.responses).toEqual([
      expect.objectContaining({ userId: ownerId, answer: 'yes' }),
    ]);
    expect(await prisma.event.count()).toBe(eventCount);
    expect(await prisma.location.findUniqueOrThrow({ where: { id: locationId } })).toEqual(
      original
    );
  });

  it('stores a place on its first suggestion and reuses it on the next one', async () => {
    const placeId = `place-${randomUUID()}`;
    newExternalIds.push(placeId);
    const location = { kind: 'new' as const, value: newLocation(placeId) };

    const first = await proposals.createSuggestion(data({ location }));
    const second = await proposals.createSuggestion(data({ location }));

    expect(second.location).toEqual(first.location);
    expect(await prisma.location.count({ where: { externalId: placeId } })).toBe(1);
  });

  it('rolls back a new place when the suggestion fails', async () => {
    const placeId = `place-${randomUUID()}`;
    newExternalIds.push(placeId);
    const location = { kind: 'new' as const, value: newLocation(placeId) };

    await expect(
      proposals.createSuggestion(data({ location, ownerId: randomUUID() }))
    ).rejects.toThrow();

    expect(await prisma.location.count({ where: { externalId: placeId } })).toBe(0);
  });

  // Each match test uses its own place, so the notification can be found by its location.
  const createWithOwnPlace = (overrides: Partial<CreateSuggestionData> = {}) => {
    const placeId = `place-${randomUUID()}`;
    newExternalIds.push(placeId);
    return proposals.createSuggestion(
      data({ location: { kind: 'new', value: newLocation(placeId) }, ...overrides })
    );
  };
  const matchNotificationCount = (locationId: string) =>
    prisma.groupNotification.count({ where: { type: 'match', locationId } });

  it('matches only when the last member accepts and records the location in the notification', async () => {
    const suggestion = await createWithOwnPlace({ name: 'Bar de sexta' });
    const { id } = suggestion;

    await expect(accept(id, firstMemberId)).resolves.toMatchObject({ matched: false });
    const last = await accept(id, secondMemberId);

    expect(last.matched).toBe(true);
    expect(await prisma.proposal.findUniqueOrThrow({ where: { id } })).toMatchObject({
      matchedAt: last.response.createdAt,
      eventId: null,
    });
    expect(
      await prisma.groupNotification.findMany({
        where: { locationId: suggestion.location.id },
        select: { type: true, groupId: true, message: true, eventId: true, locationId: true },
      })
    ).toEqual([
      {
        type: 'match',
        groupId,
        message: 'Deu match! Todo o grupo aceitou a sugestão "Bar de sexta".',
        eventId: null,
        locationId: suggestion.location.id,
      },
    ]);
  });

  it('records one match notification per suggestion even when they share the location', async () => {
    const first = await createWithOwnPlace();
    const second = await proposals.createSuggestion(
      data({
        location: {
          kind: 'existing',
          id: first.location.id,
        },
      })
    );
    expect(second.location.id).toBe(first.location.id);

    for (const { id } of [first, second]) {
      await accept(id, firstMemberId);
      await expect(accept(id, secondMemberId)).resolves.toMatchObject({ matched: true });
    }

    expect(await matchNotificationCount(first.location.id)).toBe(2);
  });

  it('matches when a refusal is changed to an acceptance, but only once', async () => {
    const suggestion = await createWithOwnPlace();
    const { id } = suggestion;
    await accept(id, firstMemberId);
    await responses.create({
      proposalId: id,
      userId: secondMemberId,
      answer: 'no',
      createdAt: new Date(),
    });

    await expect(
      responses.updateAnswer(id, secondMemberId, 'yes', new Date())
    ).resolves.toMatchObject({ matched: true });
    await responses.updateAnswer(id, secondMemberId, 'no', new Date());
    await expect(
      responses.updateAnswer(id, secondMemberId, 'yes', new Date())
    ).resolves.toMatchObject({ matched: false });

    expect(await matchNotificationCount(suggestion.location.id)).toBe(1);
  });

  it('registers a single match when the last two members accept at the same time', async () => {
    const suggestion = await createWithOwnPlace();
    const { id } = suggestion;

    const results = await Promise.all([accept(id, firstMemberId), accept(id, secondMemberId)]);

    expect(results.filter(({ matched }) => matched)).toHaveLength(1);
    expect(await matchNotificationCount(suggestion.location.id)).toBe(1);
  });

  it('matches right away when the owner is the only group member', async () => {
    const result = await createWithOwnPlace({ groupId: soloGroupId });

    expect(result.matched).toBe(true);
    expect(await matchNotificationCount(result.location.id)).toBe(1);
  });
});
