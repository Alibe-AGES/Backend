import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { ProposalResponseController } from '../../../../src/modules/proposals/http/proposal-response.controller';
import { ProposalsModule } from '../../../../src/modules/proposals/proposals.module';
import { GroupsModule } from '../../../../src/modules/groups/groups.module';
import { AnswerEnum } from '../../../../generated/prisma/enums';
import { GroupsController } from '../../../../src/modules/groups/http/groups.controller';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryObjectStorage } from '../../../../test/helpers/in-memory-object.storage';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';

describe('ProposalsModule integration', () => {
  let moduleFixture: TestingModule;

  const prisma = {
    event: { findUnique: jest.fn() },
    proposalResponse: { create: jest.fn() },
    proposal: { findMany: jest.fn() },
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({ imports: [ProposalsModule, GroupsModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects controller, use case and Prisma repository to create a response', async () => {
    prisma.event.findUnique.mockResolvedValue({
      proposals: [{ id: PROPOSAL_ID }],
      group: { users: [{ userId: USER_ID }] },
    });
    prisma.proposalResponse.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: '66666666-6666-4666-8666-666666666666', ...data })
    );

    const controller = moduleFixture.get(ProposalResponseController);
    const result = await controller.create(EVENT_ID, { answer: 'yes' }, {
      user: { id: USER_ID },
    } as AuthenticatedRequest);

    expect(prisma.proposalResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ proposalId: PROPOSAL_ID, userId: USER_ID, answer: 'yes' }),
    });
    expect(result).toMatchObject({
      id: '66666666-6666-4666-8666-666666666666',
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes',
    });
  });

  it('connects GroupsController, GetProposalByGroupUseCase and Prisma repository to fetch group proposals', async () => {
    const mockPrismaProposals = [
      {
        id: PROPOSAL_ID,
        createdAt: new Date('2026-12-31T18:55:48.552Z'),
        owner: {
          id: USER_ID,
          name: 'João Silva',
          profilePic: '/users/111/pic',
        },
        event: {
          id: EVENT_ID,
          name: 'Churrasco',
          timeslot: new Date('2026-12-31T21:00:00.000Z'),
          image: 'event.jpg',
          budgetStart: 50,
          budgetEnd: 100,
          status: 'pending',
          groupId: GROUP_ID,
          createdAt: new Date(),
          updatedAt: new Date(),
          location: {
            id: 'loc-1',
            description: 'Parque',
            manuallyCreated: true,
          },
        },
        responses: [{ userId: USER_ID, answer: AnswerEnum.yes }],
      },
    ];

    prisma.proposal.findMany.mockResolvedValue(mockPrismaProposals);

    const groupsController = moduleFixture.get(GroupsController);
    const result = await groupsController.getProposals(GROUP_ID, {
      user: { id: USER_ID },
    } as AuthenticatedRequest);

    expect(prisma.proposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event: expect.objectContaining({
            groupId: GROUP_ID,
          }),
        }),
      })
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: PROPOSAL_ID,
      myAnswer: AnswerEnum.yes,
      event: expect.objectContaining({
        id: EVENT_ID,
        name: 'Churrasco',
        date: '2026-12-31',
        time: '21:00',
      }),
    });
  });
});
