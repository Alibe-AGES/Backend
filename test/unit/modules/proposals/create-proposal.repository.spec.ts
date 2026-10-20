import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { CreateCatalogEventData } from '../../../../src/modules/events/domain/event.repository';
import { PrismaEventRepository } from '../../../../src/modules/events/persistence/prisma-event.repository';

describe('PrismaEventRepository proposal creation', () => {
  const catalogLocation = { externalId: 'place-1', description: 'Café', address: 'Rua A' };
  const data: CreateCatalogEventData = {
    id: 'event-id',
    groupId: 'group-id',
    ownerId: 'owner-id',
    location: catalogLocation,
    name: 'Café',
    timeslot: new Date('2026-10-17T15:00:00.000Z'),
    image: null,
    budgetStart: '0',
    budgetEnd: '60.126',
    status: 'pending',
    ownerAnswer: 'yes',
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
  };
  const location = { id: 'location-id', description: null, address: 'Rua A' };
  const select = { id: true, description: true, address: true };

  function setup(budgetStart = data.budgetStart, budgetEnd = data.budgetEnd) {
    const transaction = {
      location: {
        findFirst: jest.fn().mockResolvedValue(location),
        create: jest.fn().mockResolvedValue(location),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: data.id }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          ...data,
          budgetStart: budgetStart === null ? null : new Prisma.Decimal(budgetStart),
          budgetEnd: budgetEnd === null ? null : new Prisma.Decimal(budgetEnd),
        }),
      },
      proposal: {
        create: jest.fn().mockResolvedValue({ id: 'proposal-id' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'proposal-id',
          createdAt: data.createdAt,
          owner: { id: data.ownerId, name: 'Ana', profilePic: null },
        }),
      },
      proposalResponse: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'response-id', userId: data.ownerId, answer: 'yes' }),
      },
      groupNotification: { create: jest.fn() },
    };
    const prisma = {
      location: { findFirst: jest.fn().mockResolvedValue(location) },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction)
      ),
    };
    return {
      transaction,
      prisma,
      repository: new PrismaEventRepository(prisma as unknown as PrismaService),
    };
  }

  it.each([location, null])(
    'looks up a stored catalog location by Place ID without writing: %p',
    async (result) => {
      const { repository, prisma } = setup();
      prisma.location.findFirst.mockResolvedValue(result);
      await expect(repository.findCatalogLocation('place-1')).resolves.toEqual(result);
      expect(prisma.location.findFirst).toHaveBeenCalledWith({
        where: { externalId: 'place-1', manuallyCreated: false },
        select,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['0', '60.126', '0.00', '60.13'],
    [null, null, null, null],
  ])(
    'creates the associations with budgets %p and %p',
    async (budgetStart, budgetEnd, start, end) => {
      const { repository, prisma, transaction } = setup(budgetStart, budgetEnd);
      const input = { ...data, budgetStart, budgetEnd };
      await expect(repository.createWithCatalogLocation(input)).resolves.toEqual({
        id: 'proposal-id',
        createdAt: data.createdAt,
        owner: { id: data.ownerId, name: 'Ana', image: null },
        event: {
          id: data.id,
          name: data.name,
          timeslot: data.timeslot,
          budgetStart: start,
          budgetEnd: end,
          status: 'pending',
          groupId: data.groupId,
        },
        location,
        myAnswer: 'yes',
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transaction.location.findFirst).toHaveBeenCalledWith({
        where: { externalId: 'place-1', manuallyCreated: false },
        select,
      });
      expect(transaction.location.create).not.toHaveBeenCalled();
      expect(transaction.event.create).toHaveBeenCalledWith({
        data: {
          id: data.id,
          name: data.name,
          timeslot: data.timeslot,
          image: null,
          budgetStart,
          budgetEnd,
          status: 'pending',
          createdAt: data.createdAt,
          groupId: data.groupId,
          locationId: location.id,
        },
        select: { id: true },
      });
      expect(transaction.proposal.create).toHaveBeenCalledWith({
        data: { eventId: data.id, ownerId: data.ownerId, createdAt: data.createdAt },
        select: { id: true },
      });
      expect(transaction.proposalResponse.create).toHaveBeenCalledWith({
        data: {
          proposalId: 'proposal-id',
          userId: data.ownerId,
          answer: 'yes',
          createdAt: data.createdAt,
        },
        select: { id: true, userId: true, answer: true },
      });
      expect(transaction.groupNotification.create).not.toHaveBeenCalled();
    }
  );

  it('stores the catalog location in the same transaction when it is used for the first time', async () => {
    const { repository, transaction } = setup();
    const created = { id: 'new-location-id', description: 'Café', address: 'Rua A' };
    transaction.location.findFirst.mockResolvedValue(null);
    transaction.location.create.mockResolvedValue(created);

    const result = await repository.createWithCatalogLocation(data);

    expect(transaction.location.create).toHaveBeenCalledWith({
      data: { ...catalogLocation, manuallyCreated: false },
      select,
    });
    expect(transaction.event.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locationId: created.id }) })
    );
    expect(result.location).toEqual(created);
  });

  it.each(['proposal', 'proposalResponse'] as const)(
    'propagates a %s insert failure out of the transaction',
    async (stage) => {
      const { repository, transaction } = setup();
      const failure = new Error('Insert failed');
      transaction[stage].create.mockRejectedValue(failure);
      await expect(repository.createWithCatalogLocation(data)).rejects.toBe(failure);
      expect(transaction.event.create).toHaveBeenCalledTimes(1);
      expect(transaction.proposal.findUniqueOrThrow).not.toHaveBeenCalled();
      if (stage === 'proposal') expect(transaction.proposalResponse.create).not.toHaveBeenCalled();
    }
  );
});
