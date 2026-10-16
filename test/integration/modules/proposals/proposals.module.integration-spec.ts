import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { ProposalResponseController } from '../../../../src/modules/proposals/http/proposal-response.controller';
import { ProposalsModule } from '../../../../src/modules/proposals/proposals.module';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('ProposalsModule integration', () => {
  let moduleFixture: TestingModule;

  const prisma = {
    event: { findUnique: jest.fn() },
    proposalResponse: { create: jest.fn() },
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({ imports: [ProposalsModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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
});
