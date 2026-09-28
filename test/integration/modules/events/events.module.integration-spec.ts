import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { EventsModule } from '../../../../src/modules/events/events.module';
import { EventController } from '../../../../src/modules/events/http/event.controller';
import { EventNotFoundError, GetEventUseCase } from '../../../../src/modules/events/application/get-event.use-case';
import { EventRepository } from '../../../../src/modules/events/domain/event.repository';
import type { CreateEventDto } from '../../../../src/modules/events/http/dto/create-event.dto';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

const groupId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';

const authenticatedRequest = {
  user: { id: userId },
} as AuthenticatedRequest;

describe('EventsModule integration', () => {
  let moduleFixture: TestingModule;

  const findUnique = jest.fn();

  const transaction = {
    location: { create: jest.fn() },
    event: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
    proposal: { create: jest.fn() },
    proposalResponse: { create: jest.fn() },
  };

  const prisma = {
    group: { findUnique: jest.fn() },
    event: { findUnique },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  } as unknown as PrismaService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [EventsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .compile();
  });

  afterAll(async () => {
    await moduleFixture?.close();
  });

  beforeEach(() => {
    findUnique.mockReset();
    jest.clearAllMocks();
  });

  it('registers the events controller and connects use cases to repository', () => {
    expect(moduleFixture.get(EventController)).toBeInstanceOf(EventController);
    expect(moduleFixture.get(GetEventUseCase)).toBeDefined();
    expect(moduleFixture.get(EventRepository)).toBeDefined();
  });

  it('connects controller, use case and Prisma repository to create an event', async () => {
    const createdAt = new Date('2026-09-22T18:30:00.000Z');
    (prisma.group.findUnique as jest.Mock).mockResolvedValue({ users: [{ userId }] });
    transaction.location.create.mockResolvedValue({ id: 'location-id' });
    transaction.event.create.mockImplementation(({ data }: { data: { id: string } }) =>
      Promise.resolve({ id: data.id })
    );
    transaction.proposal.create.mockResolvedValue({ id: 'proposal-id' });
    transaction.proposalResponse.create.mockResolvedValue({
      id: 'response-id',
      userId,
      answer: 'yes',
    });
    transaction.event.findUniqueOrThrow.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        name: 'Jantar',
        timeslot: new Date('2026-10-15T20:00:00.000Z'),
        image: null,
        budgetStart: null,
        budgetEnd: null,
        status: 'pending',
        groupId,
        locationId: 'location-id',
        location: { id: 'location-id', description: 'Casa', manuallyCreated: true },
        proposals: [{ id: 'proposal-id', ownerId: userId }],
        createdAt,
        updatedAt: createdAt,
      })
    );

    const controller = moduleFixture.get(EventController);
    const result = await controller.create(
      groupId,
      { name: 'Jantar', date: '2026-10-15', time: '20:00', location: 'Casa' } as CreateEventDto,
      undefined,
      authenticatedRequest
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.location.create).toHaveBeenCalledWith({
      data: { description: 'Casa', manuallyCreated: true },
      select: { id: true },
    });
    expect(result).toMatchObject({
      name: 'Jantar',
      status: 'pending',
      location: { id: 'location-id', manuallyCreated: true },
      proposal: {
        id: 'proposal-id',
        ownerId: userId,
        response: { id: 'response-id', userId, answer: 'yes' },
      },
    });
  });

  describe('EventController - get', () => {
    it('returns event details when event exists and user belongs to the group', async () => {
      const controller = moduleFixture.get(EventController);
      const eventId = '22222222-2222-4222-8222-222222222222';

      const mockEventRow = {
        id: eventId,
        name: 'Jantar da Turma',
        timeslot: new Date('2026-10-15T20:00:00.000Z'),
        budgetStart: 50.0,
        budgetEnd: 100.0,
        status: 'confirmed',
        createdAt: new Date('2026-08-01'),
        groupId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        locationId: 'location-123',
        location: {
          id: 'location-123',
          description: 'Restaurante Central',
          manuallyCreated: false,
        },
        proposals: [
          {
            id: 'proposal-1',
            owner: {
              id: userId,
              name: 'Ana Souza',
              profilePic: 'users/profile.png',
            },
            responses: [],
            createdAt: new Date('2026-08-02'),
          },
        ],
      };

      findUnique.mockResolvedValue(mockEventRow);

      const result = await controller.get(eventId, authenticatedRequest);

      expect(result).toEqual({
        id: eventId,
        name: 'Jantar da Turma',
        timeslot: mockEventRow.timeslot,
        budgetStart: '50.00',
        budgetEnd: '100.00',
        status: 'confirmed',
        createdAt: mockEventRow.createdAt,
        groupId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        location: mockEventRow.location,
        proposals: [
          {
            id: 'proposal-1',
            owner: {
              id: userId,
              name: 'Ana Souza',
              image: 'users/profile.png',
            },
            responses: [],
            createdAt: mockEventRow.proposals[0].createdAt,
          },
        ],
      });

      expect(findUnique).toHaveBeenCalledWith({
        where: {
          id: eventId,
          group: {
            users: {
              some: { userId },
            },
          },
        },
        select: expect.any(Object),
      });
    });

    it('throws NotFoundException when event does not exist or user is not in group', async () => {
      const controller = moduleFixture.get(EventController);
      const eventId = '99999999-9999-4999-8999-999999999999';

      findUnique.mockResolvedValue(null);

      await expect(controller.get(eventId, authenticatedRequest)).rejects.toThrow(
        EventNotFoundError
      );
    });
  });
});