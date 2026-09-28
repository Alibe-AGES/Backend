import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { EventModule } from '../../../../src/modules/event/event.module';
import { EventController } from '../../../../src/modules/event/http/event.controller';
import { EventNotFoundError, GetEventUseCase } from '../../../../src/modules/event/application/get-event.use-case';
import { EventRepository } from '../../../../src/modules/event/domain/event.repository';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

const authenticatedRequest = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as AuthenticatedRequest;

describe('EventModule integration', () => {
  let module: TestingModule;
  const findUnique = jest.fn();

  const prisma = {
    event: { findUnique },
  } as unknown as PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('registers the events controller and connects use cases to repository', () => {
    expect(module.get(EventController)).toBeInstanceOf(EventController);
    expect(module.get(GetEventUseCase)).toBeDefined();
    expect(module.get(EventRepository)).toBeDefined();
  });

  describe('EventController', () => {
    it('returns event details when event exists and user belongs to the group', async () => {
      const controller = module.get(EventController);
      const eventId = '22222222-2222-4222-8222-222222222222';
      const userId = authenticatedRequest.user.id;

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
      const controller = module.get(EventController);
      const eventId = '99999999-9999-4999-8999-999999999999';

      findUnique.mockResolvedValue(null);

      await expect(controller.get(eventId, authenticatedRequest)).rejects.toThrow(
        EventNotFoundError
      );
    });
  });
});
