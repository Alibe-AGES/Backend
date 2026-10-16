import { PrismaProposalRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal.repository';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { AnswerEnum } from '../../../../generated/prisma/enums';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';
const LOCATION_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('PrismaProposalRepository', () => {
  let prisma: { proposal: { findMany: jest.Mock } };
  let repository: PrismaProposalRepository;

  beforeEach(() => {
    prisma = {
      proposal: {
        findMany: jest.fn(),
      },
    };

    repository = new PrismaProposalRepository(prisma as unknown as PrismaService);
    jest.resetAllMocks();
  });

  it('returns proposals for an existent group', async () => {
    const mockPrismaProposals = [
      {
        id: PROPOSAL_ID,
        createdAt: new Date('2026-10-14T18:55:48.552Z'),
        owner: {
          id: USER_ID,
          name: 'Ana Silva',
          profilePic: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
        },
        event: {
          id: EVENT_ID,
          name: 'Jantar do Grupo',
          timeslot: new Date('2026-10-14T21:00:00.000Z'),
          image: 'https://example.com/event.jpg',
          budgetStart: 70.0,
          budgetEnd: 150.0,
          status: 'pending',
          groupId: GROUP_ID,
          createdAt: new Date('2026-10-14T18:55:48.552Z'),
          updatedAt: new Date('2026-10-14T18:55:48.552Z'),
          location: {
            id: LOCATION_ID,
            description: 'Restaurante Central',
            manuallyCreated: true,
          },
        },
        responses: [
          { userId: USER_ID, answer: AnswerEnum.yes },
          { userId: '33333333-3333-4333-8333-333333333333', answer: AnswerEnum.no },
          { userId: '44444444-4444-4444-8444-444444444444', answer: AnswerEnum.pending },
        ],
      },
    ];

    prisma.proposal.findMany.mockResolvedValue(mockPrismaProposals);

    const result = await repository.findProposalsByGroup(GROUP_ID, USER_ID);

    expect(prisma.proposal.findMany).toHaveBeenCalledWith({
      where: {
        event: {
          groupId: GROUP_ID,
          group: {
            users: {
              some: {
                userId: USER_ID,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          timeslot: 'asc',
        },
      },
      include: {
        event: {
          include: {
            location: true,
          },
        },
        owner: true,
        responses: true,
      },
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: PROPOSAL_ID,
      createdAt: new Date('2026-10-14T18:55:48.552Z'),
      owner: {
        id: USER_ID,
        name: 'Ana Silva',
        image: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
      },
      event: {
        id: EVENT_ID,
        name: 'Jantar do Grupo',
        date: '2026-10-14',
        time: '21:00',
        image: 'https://example.com/event.jpg',
        budgetStart: '70',
        budgetEnd: '150',
        status: 'pending',
        groupId: GROUP_ID,
        location: null,
        proposal: null,
        createdAt: new Date('2026-10-14T18:55:48.552Z'),
        updatedAt: new Date('2026-10-14T18:55:48.552Z'),
      },
      location: {
        id: LOCATION_ID,
        description: 'Restaurante Central',
        manuallyCreated: true,
      },
      responses: {
        yes: 1,
        no: 1,
        pending: 1,
      },
      myAnswer: AnswerEnum.yes,
    });
  });

  it('returns empty array when the group has no active proposals', async () => {
    prisma.proposal.findMany.mockResolvedValue([]);

    const result = await repository.findProposalsByGroup(GROUP_ID, USER_ID);

    expect(result).toEqual([]);
    expect(prisma.proposal.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when the group id is invalid or does not exist', async () => {
    const invalidGroupId = 'non-existent-group-id';
    prisma.proposal.findMany.mockResolvedValue([]);

    const result = await repository.findProposalsByGroup(invalidGroupId, USER_ID);

    expect(result).toEqual([]);
    expect(prisma.proposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            groupId: invalidGroupId,
          }),
        }),
      })
    );
  });
});
