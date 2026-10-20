import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import type { CreateSuggestionData } from '../../../../src/modules/proposals/domain/proposal.repository';
import { PrismaProposalRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal.repository';

describe('PrismaProposalRepository', () => {
  const catalogLocation = { externalId: 'place-1', description: 'Café', address: 'Rua A' };
  const data: CreateSuggestionData = {
    id: 'proposal-id',
    groupId: 'group-id',
    ownerId: 'owner-id',
    location: catalogLocation,
    name: 'Café',
    timeslot: new Date('2026-10-17T15:00:00.000Z'),
    budgetStart: '0',
    budgetEnd: '60.126',
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
  };
  const location = { id: 'location-id', description: null, address: 'Rua A' };
  const select = { id: true, description: true, address: true };

  function setup({
    budgetStart = data.budgetStart,
    budgetEnd = data.budgetEnd,
    memberIds = ['owner-id', 'other-id'],
  } = {}) {
    const transaction = {
      location: {
        findFirst: jest.fn().mockResolvedValue(location),
        create: jest.fn().mockResolvedValue(location),
      },
      proposal: {
        create: jest.fn().mockResolvedValue({
          id: data.id,
          groupId: data.groupId,
          name: data.name,
          timeslot: data.timeslot,
          budgetStart: budgetStart === null ? null : new Prisma.Decimal(budgetStart),
          budgetEnd: budgetEnd === null ? null : new Prisma.Decimal(budgetEnd),
          createdAt: data.createdAt,
          owner: { id: data.ownerId, name: 'Ana', profilePic: null },
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          type: 'suggestion',
          name: data.name,
          matchedAt: null,
          groupId: data.groupId,
          group: { users: memberIds.map((userId) => ({ userId })) },
          responses: [{ userId: data.ownerId }],
        }),
        update: jest.fn(),
      },
      proposalResponse: { create: jest.fn().mockResolvedValue({ answer: 'yes' }) },
      groupNotification: { create: jest.fn() },
      event: { create: jest.fn() },
    };
    const prisma = {
      group: { findUnique: jest.fn() },
      location: { findFirst: jest.fn().mockResolvedValue(location) },
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) =>
        callback(transaction)
      ),
    };
    return {
      transaction,
      prisma,
      repository: new PrismaProposalRepository(prisma as unknown as PrismaService),
    };
  }

  it.each([
    [null, null],
    [{ users: [] }, false],
    [{ users: [{ userId: 'owner-id' }] }, true],
  ])('maps the group lookup %p to membership %p', async (group, expected) => {
    const { repository, prisma } = setup();
    prisma.group.findUnique.mockResolvedValue(group);

    await expect(repository.findGroupMembership('group-id', 'owner-id')).resolves.toBe(expected);
  });

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
    'creates only the suggestion and the owner acceptance with budgets %p and %p',
    async (budgetStart, budgetEnd, start, end) => {
      const { repository, prisma, transaction } = setup({ budgetStart, budgetEnd });
      await expect(
        repository.createSuggestion({ ...data, budgetStart, budgetEnd })
      ).resolves.toEqual({
        id: data.id,
        type: 'suggestion',
        groupId: data.groupId,
        name: data.name,
        timeslot: data.timeslot,
        budgetStart: start,
        budgetEnd: end,
        createdAt: data.createdAt,
        owner: { id: data.ownerId, name: 'Ana', image: null },
        location,
        myAnswer: 'yes',
        matched: false,
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(transaction.location.create).not.toHaveBeenCalled();
      expect(transaction.proposal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            id: data.id,
            type: 'suggestion',
            groupId: data.groupId,
            ownerId: data.ownerId,
            name: data.name,
            locationId: location.id,
            timeslot: data.timeslot,
            budgetStart,
            budgetEnd,
            createdAt: data.createdAt,
          },
        })
      );
      expect(transaction.proposalResponse.create).toHaveBeenCalledWith({
        data: {
          proposalId: data.id,
          userId: data.ownerId,
          answer: 'yes',
          createdAt: data.createdAt,
        },
        select: { answer: true },
      });
      expect(transaction.event.create).not.toHaveBeenCalled();
      expect(transaction.groupNotification.create).not.toHaveBeenCalled();
    }
  );

  it('stores the catalog location in the same transaction when it is used for the first time', async () => {
    const { repository, transaction } = setup();
    const created = { id: 'new-location-id', description: 'Café', address: 'Rua A' };
    transaction.location.findFirst.mockResolvedValue(null);
    transaction.location.create.mockResolvedValue(created);

    const result = await repository.createSuggestion(data);

    expect(transaction.location.create).toHaveBeenCalledWith({
      data: { ...catalogLocation, manuallyCreated: false },
      select,
    });
    expect(transaction.proposal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locationId: created.id }) })
    );
    expect(result.location).toEqual(created);
  });

  it('registers the match right away when the owner is the only group member', async () => {
    const { repository, transaction } = setup({ memberIds: ['owner-id'] });

    await expect(repository.createSuggestion(data)).resolves.toMatchObject({ matched: true });
    expect(transaction.groupNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'match', proposalId: data.id }),
      select: { id: true },
    });
  });

  it('propagates a failed acceptance insert out of the transaction', async () => {
    const { repository, transaction } = setup();
    const failure = new Error('Insert failed');
    transaction.proposalResponse.create.mockRejectedValue(failure);

    await expect(repository.createSuggestion(data)).rejects.toBe(failure);
    expect(transaction.proposal.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
