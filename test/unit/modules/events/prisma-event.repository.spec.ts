import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaEventRepository } from '../../../../src/modules/events/persistence/prisma-event.repository';

describe('PrismaEventRepository', () => {
  const eventId = '22222222-2222-4222-8222-222222222222';
  const baseRecord = {
    id: eventId,
    name: 'Event',
    timeslot: new Date('2026-10-15T20:00:00.000Z'),
    image: 'https://example.com/event.jpg',
    budgetStart: { toString: () => '50.00' },
    budgetEnd: null,
    status: 'pending',
    groupId: '33333333-3333-4333-8333-333333333333',
    locationId: '44444444-4444-4444-8444-444444444444',
    location: {
      id: '44444444-4444-4444-8444-444444444444',
      description: 'Location',
      manuallyCreated: true,
    },
    proposals: [{ id: '55555555-5555-4555-8555-555555555555', ownerId: 'owner-id' }],
    createdAt: new Date('2026-09-22T18:30:00.000Z'),
    updatedAt: new Date('2026-09-22T18:30:00.000Z'),
  };

  it('loads and maps an event with its proposals and location', async () => {
    const findUnique = jest.fn().mockResolvedValue(baseRecord);
    const prisma = { event: { findUnique } } as unknown as PrismaService;
    const repository = new PrismaEventRepository(prisma);

    const result = await repository.findById(eventId);

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: eventId }, include: expect.any(Object) })
    );
    expect(result).toMatchObject({
      id: eventId,
      image: baseRecord.image,
      budgetStart: '50.00',
      location: baseRecord.location,
      proposals: baseRecord.proposals,
    });
  });

  it('reuses a matching manual location and updates only supplied values', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: baseRecord.location.id });
    const locationCreate = jest.fn();
    const eventUpdate = jest.fn().mockResolvedValue({
      ...baseRecord,
      image: null,
      location: { ...baseRecord.location, description: 'New location' },
    });
    const transaction = {
      location: { findFirst, create: locationCreate },
      event: { update: eventUpdate },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction)
      ),
    } as unknown as PrismaService;
    const repository = new PrismaEventRepository(prisma);

    await repository.update(eventId, { image: null, location: 'New location' });

    expect(findFirst).toHaveBeenCalledWith({
      where: { description: 'New location', manuallyCreated: true },
      select: { id: true },
    });
    expect(locationCreate).not.toHaveBeenCalled();
    expect(eventUpdate).toHaveBeenCalledWith({
      where: { id: eventId },
      data: { image: null, location: { connect: { id: baseRecord.location.id } } },
      include: expect.any(Object),
    });
  });

  it('returns the updatedAt value persisted by Prisma after an event update', async () => {
    const updatedAt = new Date('2026-09-23T14:00:00.000Z');
    const transaction = {
      location: { findFirst: jest.fn(), create: jest.fn() },
      event: {
        update: jest.fn().mockResolvedValue({ ...baseRecord, name: 'Changed', updatedAt }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction)
      ),
    } as unknown as PrismaService;
    const repository = new PrismaEventRepository(prisma);

    const result = await repository.update(eventId, { name: 'Changed' });

    expect(result.updatedAt).toEqual(updatedAt);
    expect(transaction.event.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: 'Changed' } })
    );
  });

  it('creates a manually entered location when no matching location exists', async () => {
    const locationCreate = jest
      .fn()
      .mockResolvedValue({ id: '66666666-6666-4666-8666-666666666666' });
    const transaction = {
      location: { findFirst: jest.fn().mockResolvedValue(null), create: locationCreate },
      event: {
        update: jest.fn().mockResolvedValue({
          ...baseRecord,
          location: {
            id: '66666666-6666-4666-8666-666666666666',
            description: 'New location',
            manuallyCreated: true,
          },
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction)
      ),
    } as unknown as PrismaService;
    const repository = new PrismaEventRepository(prisma);

    await repository.update(eventId, { location: 'New location' });

    expect(locationCreate).toHaveBeenCalledWith({
      data: { description: 'New location', manuallyCreated: true },
      select: { id: true },
    });
  });

  it.each([
    [null, null],
    [{ users: [] }, false],
    [{ users: [{ userId: 'owner-id' }] }, true],
  ])('resolves group membership from %p as %p', async (group, expected) => {
    const findUnique = jest.fn().mockResolvedValue(group);
    const prisma = { group: { findUnique } } as unknown as PrismaService;
    const repository = new PrismaEventRepository(prisma);

    await expect(repository.findGroupMembership(baseRecord.groupId, 'owner-id')).resolves.toBe(
      expected
    );
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: baseRecord.groupId } })
    );
  });

  it('creates location, event, proposal and owner response inside one transaction', async () => {
    const createdAt = new Date('2026-09-22T18:30:00.000Z');
    const ownerResponse = {
      id: '66666666-6666-4666-8666-666666666666',
      userId: 'owner-id',
      answer: 'yes',
    };
    const transaction = {
      location: { create: jest.fn().mockResolvedValue({ id: baseRecord.location.id }) },
      event: {
        create: jest.fn().mockResolvedValue({ id: eventId }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(baseRecord),
      },
      proposal: { create: jest.fn().mockResolvedValue({ id: baseRecord.proposals[0].id }) },
      proposalResponse: { create: jest.fn().mockResolvedValue(ownerResponse) },
    };
    const $transaction = jest.fn((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction)
    );
    const repository = new PrismaEventRepository({ $transaction } as unknown as PrismaService);

    const result = await repository.create({
      id: eventId,
      groupId: baseRecord.groupId,
      ownerId: 'owner-id',
      name: 'Event',
      timeslot: baseRecord.timeslot,
      location: { description: 'Location', manuallyCreated: true },
      image: null,
      budgetStart: '50.00',
      budgetEnd: null,
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt,
    });

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(transaction.location.create).toHaveBeenCalledWith({
      data: { description: 'Location', manuallyCreated: true },
      select: { id: true },
    });
    expect(transaction.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: eventId,
        status: 'pending',
        groupId: baseRecord.groupId,
        locationId: baseRecord.location.id,
      }),
      select: { id: true },
    });
    expect(transaction.proposal.create).toHaveBeenCalledWith({
      data: { eventId, ownerId: 'owner-id', createdAt },
      select: { id: true },
    });
    expect(transaction.proposalResponse.create).toHaveBeenCalledWith({
      data: {
        proposalId: baseRecord.proposals[0].id,
        userId: 'owner-id',
        answer: 'yes',
        createdAt,
      },
      select: { id: true, userId: true, answer: true },
    });
    expect(result.event).toMatchObject({ id: eventId, budgetStart: '50.00' });
    expect(result.ownerResponse).toEqual(ownerResponse);
  });
});
