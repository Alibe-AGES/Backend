import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import type { CreateSuggestionData } from '../../../../src/modules/proposals/domain/proposal.repository';
import { PrismaProposalRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal.repository';

describe('PrismaProposalRepository', () => {
  const location = {
    id: 'location-id',
    externalId: 'place-1',
    name: 'Café',
    description: 'Café',
    address: 'Rua A',
    openingHours: [],
    rating: 4.5,
    phoneNumber: null,
    website: null,
    priceStart: null,
    priceEnd: null,
    priceCurrency: null,
    image: null,
    manuallyCreated: false,
  };
  const newLocation = {
    id: 'new-location-id',
    externalId: 'place-2',
    name: 'Novo café',
    description: 'Café novo',
    address: 'Rua B',
    openingHours: ['segunda: 09:00–18:00'],
    rating: 4.8,
    phoneNumber: '+55 51 3333-4444',
    website: 'https://cafe.example',
    priceRange: { start: '50.00', end: '70.00', currencyCode: 'BRL' },
    image: null,
    manuallyCreated: false,
  };
  const data: CreateSuggestionData = {
    id: 'proposal-id',
    groupId: 'group-id',
    ownerId: 'owner-id',
    location: { kind: 'existing', id: location.id },
    name: 'Café',
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
  };
  const storedLocation = {
    id: location.id,
    externalId: location.externalId,
    name: location.name,
    description: location.description,
    address: location.address,
    openingHours: [],
    rating: location.rating,
    phoneNumber: null,
    website: null,
    priceRange: { start: null, end: null, currencyCode: null },
    image: null,
    manuallyCreated: false,
  };

  function setup({ memberIds = ['owner-id', 'other-id'] } = {}) {
    const transaction = {
      location: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(location),
        create: jest.fn().mockResolvedValue(location),
        upsert: jest.fn().mockResolvedValue(location),
      },
      proposal: {
        create: jest.fn().mockResolvedValue({
          id: data.id,
          groupId: data.groupId,
          name: data.name,
          createdAt: data.createdAt,
          owner: { id: data.ownerId, name: 'Ana', profilePic: null },
        }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          type: 'suggestion',
          name: data.name,
          matchedAt: null,
          groupId: data.groupId,
          locationId: location.id,
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
      location: { findUnique: jest.fn().mockResolvedValue(location) },
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
      prisma.location.findUnique.mockResolvedValue(result);
      await expect(repository.findCatalogLocation('place-1')).resolves.toEqual(
        result ? storedLocation : null
      );
      expect(prisma.location.findUnique).toHaveBeenCalledWith({
        where: { externalId: 'place-1', manuallyCreated: false },
        select: expect.any(Object),
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it('creates only the suggestion and the owner acceptance', async () => {
    const { repository, prisma, transaction } = setup();
    await expect(repository.createSuggestion(data)).resolves.toEqual({
      id: data.id,
      type: 'suggestion',
      groupId: data.groupId,
      name: data.name,
      createdAt: data.createdAt,
      owner: { id: data.ownerId, name: 'Ana', image: null },
      location: storedLocation,
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
  });

  it('stores the catalog location in the same transaction when it is used for the first time', async () => {
    const { repository, transaction } = setup();
    const created = {
      ...location,
      ...newLocation,
      priceStart: { toFixed: () => '50.00' },
      priceEnd: { toFixed: () => '70.00' },
      priceCurrency: 'BRL',
    };
    transaction.location.upsert.mockResolvedValue(created);

    const result = await repository.createSuggestion({
      ...data,
      location: { kind: 'new', value: newLocation },
    });

    expect(transaction.location.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalId: newLocation.externalId },
        update: {},
        create: expect.objectContaining({
          id: newLocation.id,
          externalId: newLocation.externalId,
          priceStart: '50.00',
          priceEnd: '70.00',
        }),
      })
    );
    expect(transaction.proposal.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locationId: created.id }) })
    );
    expect(result.location).toEqual(newLocation);
  });

  it('registers the match right away when the owner is the only group member', async () => {
    const { repository, transaction } = setup({ memberIds: ['owner-id'] });

    await expect(repository.createSuggestion(data)).resolves.toMatchObject({ matched: true });
    expect(transaction.groupNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'match', locationId: location.id }),
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
