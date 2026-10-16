import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from 'src/modules/auth/http/authenticated-user';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaEventRepository } from '../../../../src/modules/events/persistence/prisma-event.repository';

const authenticatedRequest = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as AuthenticatedRequest;

describe('PrismaEventRepository', () => {
  const eventId = '22222222-2222-4222-8222-222222222222';
  const createdAt = new Date('2026-09-22T18:30:00.000Z');
  const timeslot = new Date('2026-10-15T20:00:00.000Z');

  const baseRecord = {
    id: eventId,
    name: 'Event',
    timeslot,
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
    createdAt,
    updatedAt: createdAt,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
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
  });
  describe('findEventDetails', () => {
    it('finds event details and reports group membership', async () => {
      const id = randomUUID();
      const userId = authenticatedRequest.user.id;
      const findUnique = jest.fn();

      const dbEventRow = {
        id,
        name: 'Jantar de aniversário',
        image: 'events/event/image.png',
        timeslot,
        budgetStart: 50.0,
        budgetEnd: 120.0,
        status: 'pending',
        groupId: '33333333-3333-4333-8333-333333333333',
        createdAt,
        updatedAt: createdAt,
        group: { users: [{ userId }] },
        location: {
          id: '44444444-4444-4444-8444-444444444444',
          description: 'Rua dos Andradas, 1234, Porto Alegre',
          manuallyCreated: true,
        },
        proposals: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            owner: {
              id: userId,
              name: 'Ana Beatriz Silva',
              profilePic: 'users/ana/profile-picture.jpg',
            },
            responses: [
              {
                id: '66666666-6666-4666-8666-666666666666',
                answer: 'yes',
                createdAt,
                user: {
                  id: userId,
                  name: 'Ana Beatriz Silva',
                  profilePic: 'users/ana/profile-picture.jpg',
                },
              },
            ],
            createdAt,
          },
        ],
      };

      findUnique.mockResolvedValue(dbEventRow);
      const prisma = { event: { findUnique } } as unknown as PrismaService;
      const repository = new PrismaEventRepository(prisma);

      await expect(repository.findEventDetails(id, userId)).resolves.toEqual({
        event: {
          id,
          name: 'Jantar de aniversário',
          image: 'events/event/image.png',
          timeslot,
          budgetStart: '50.00',
          budgetEnd: '120.00',
          status: 'pending',
          createdAt,
          updatedAt: createdAt,
          groupId: '33333333-3333-4333-8333-333333333333',
          location: {
            id: '44444444-4444-4444-8444-444444444444',
            description: 'Rua dos Andradas, 1234, Porto Alegre',
            manuallyCreated: true,
          },
          proposal: {
            id: '55555555-5555-4555-8555-555555555555',
            owner: {
              id: userId,
              name: 'Ana Beatriz Silva',
              image: 'users/ana/profile-picture.jpg',
            },
            responses: [
              {
                id: '66666666-6666-4666-8666-666666666666',
                answer: 'yes',
                createdAt,
                user: {
                  id: userId,
                  name: 'Ana Beatriz Silva',
                  image: 'users/ana/profile-picture.jpg',
                },
              },
            ],
            createdAt,
          },
        },
        userIsMember: true,
      });

      expect(findUnique).toHaveBeenCalledWith({
        where: { id },
        select: expect.any(Object),
      });
    });

    it('returns access with false membership for a user outside the group', async () => {
      const findUnique = jest.fn().mockResolvedValue({
        id: eventId,
        name: 'Event',
        image: null,
        timeslot,
        budgetStart: 50,
        budgetEnd: 120,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
        groupId: baseRecord.groupId,
        group: { users: [] },
        location: baseRecord.location,
        proposals: [
          {
            id: 'proposal-id',
            owner: { id: 'owner-id', name: 'Owner', profilePic: null },
            responses: [],
            createdAt,
          },
        ],
      });
      const repository = new PrismaEventRepository({
        event: { findUnique },
      } as unknown as PrismaService);

      const access = await repository.findEventDetails(eventId, 'outside-user');

      expect(access?.userIsMember).toBe(false);
    });

    it('preserves null budget bounds when loading event details', async () => {
      const userId = authenticatedRequest.user.id;
      const findUnique = jest.fn().mockResolvedValue({
        id: eventId,
        name: 'Event without budget',
        image: null,
        timeslot,
        budgetStart: null,
        budgetEnd: null,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
        groupId: baseRecord.groupId,
        group: { users: [{ userId }] },
        location: null,
        proposals: [
          {
            id: 'proposal-id',
            owner: { id: userId, name: 'Owner', profilePic: null },
            responses: [],
            createdAt,
          },
        ],
      });
      const repository = new PrismaEventRepository({
        event: { findUnique },
      } as unknown as PrismaService);

      const result = await repository.findEventDetails(eventId, userId);

      expect(result?.event).toMatchObject({ budgetStart: null, budgetEnd: null });
    });

    it('returns null when the event does not exist', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const repository = new PrismaEventRepository({
        event: { findUnique },
      } as unknown as PrismaService);

      await expect(
        repository.findEventDetails(
          '550e8400-e29b-41d4-a716-446655440000',
          authenticatedRequest.user.id
        )
      ).resolves.toBeNull();
    });
  });

  describe('update', () => {
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
  });

  describe('findImageAccess', () => {
    it('returns the image key and membership for an existing event', async () => {
      const findUnique = jest.fn().mockResolvedValue({
        image: `events/${eventId}/images/event.png`,
        group: { users: [{ userId: authenticatedRequest.user.id }] },
      });
      const prisma = { event: { findUnique } } as unknown as PrismaService;
      const repository = new PrismaEventRepository(prisma);

      await expect(
        repository.findImageAccess(eventId, authenticatedRequest.user.id)
      ).resolves.toEqual({
        imageKey: `events/${eventId}/images/event.png`,
        userIsMember: true,
      });
      expect(findUnique).toHaveBeenCalledWith({
        where: { id: eventId },
        select: {
          image: true,
          group: {
            select: {
              users: {
                where: { userId: authenticatedRequest.user.id },
                select: { userId: true },
                take: 1,
              },
            },
          },
        },
      });
    });

    it('returns null when the event does not exist', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const prisma = { event: { findUnique } } as unknown as PrismaService;
      const repository = new PrismaEventRepository(prisma);

      await expect(
        repository.findImageAccess(eventId, authenticatedRequest.user.id)
      ).resolves.toBeNull();
    });
  });

  describe('create', () => {
    it('creates location, event, proposal and owner response inside one transaction', async () => {
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

  describe('findGroupMembership', () => {
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
  });
});
