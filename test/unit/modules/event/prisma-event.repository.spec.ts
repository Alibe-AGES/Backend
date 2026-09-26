import { PrismaEventRepository } from '../../../../src/modules/event/persistence/prisma-event.repository';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { AuthenticatedRequest } from 'src/modules/auth/http/authenticated-user';
import { randomUUID } from 'crypto';

const authenticatedRequest = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as AuthenticatedRequest;

describe('PrismaEventRepository', () => {
  const findUnique = jest.fn();
  let repository: PrismaEventRepository;
  let prismaService: PrismaService;

  const prisma = {
    event: { findUnique },
  } as unknown as PrismaService;

  beforeEach(() => {
    findUnique.mockReset();
    prismaService = prisma;
    repository = new PrismaEventRepository(prismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('finds an event', async () => {
    const id = randomUUID();
    const userId = authenticatedRequest.user.id;
    const createdAt = new Date('2026-09-22T18:30:00.000Z');
    const timeslot = new Date('2026-10-15T20:00:00.000Z');

    const dbEventRow = {
      id,
      name: 'Jantar de aniversário',
      timeslot,
      budgetStart: 50.0,
      budgetEnd: 120.0,
      status: 'pending',
      groupId: '33333333-3333-4333-8333-333333333333',
      locationId: '44444444-4444-4444-8444-444444444444',
      createdAt,
      location: {
        id: '44444444-4444-4444-8444-444444444444',
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      proposals: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          owner: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            profilePic: 'https://example.com/users/ana.jpg',
          },
          responses: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              answer: 'yes',
              createdAt,
              user: {
                id: '11111111-1111-4111-8111-111111111111',
                name: 'Ana Beatriz Silva',
                profilePic: 'https://example.com/users/ana.jpg',
              },
            },
          ],
          createdAt,
        },
      ],
    };

    findUnique.mockResolvedValue(dbEventRow);

    await expect(repository.findUnique(id, userId)).resolves.toEqual({
      id,
      name: 'Jantar de aniversário',
      timeslot,
      budgetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      createdAt,
      groupId: '33333333-3333-4333-8333-333333333333',
      location: {
        id: '44444444-4444-4444-8444-444444444444',
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      proposals: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          owner: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            image: 'https://example.com/users/ana.jpg',
          },
          responses: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              answer: 'yes',
              createdAt,
              user: {
                id: '11111111-1111-4111-8111-111111111111',
                name: 'Ana Beatriz Silva',
                image: 'https://example.com/users/ana.jpg',
              },
            },
          ],
          createdAt,
        },
      ],
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: {
        id,
        group: {
          users: {
            some: {
              userId,
            },
          },
        },
      },
      select: expect.any(Object),
    });
  });

  it('returns null when the event does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      repository.findUnique('550e8400-e29b-41d4-a716-446655440000', authenticatedRequest.user.id)
    ).resolves.toBeNull();
  });
});
