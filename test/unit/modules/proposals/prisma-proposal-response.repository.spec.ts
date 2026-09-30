import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { ProposalResponseAlreadyExistsError } from '../../../../src/modules/proposals/domain/proposal-response.repository';
import { PrismaProposalResponseRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const record = {
  id: '66666666-6666-4666-8666-666666666666',
  proposalId: PROPOSAL_ID,
  userId: USER_ID,
  answer: 'yes' as const,
  createdAt: new Date('2026-09-22T18:30:00.000Z'),
};

function knownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', { code, clientVersion: 'test' });
}

describe('PrismaProposalResponseRepository', () => {
  const prisma = {
    event: { findUnique: jest.fn() },
    proposalResponse: { create: jest.fn(), update: jest.fn() },
  };
  const repository = new PrismaProposalResponseRepository(prisma as unknown as PrismaService);

  beforeEach(() => jest.resetAllMocks());

  it('loads the latest proposal and the user membership of the event group', async () => {
    prisma.event.findUnique.mockResolvedValue({
      proposals: [{ id: PROPOSAL_ID }],
      group: { users: [{ userId: USER_ID }] },
    });

    await expect(repository.findEventProposalContext(EVENT_ID, USER_ID)).resolves.toEqual({
      proposalId: PROPOSAL_ID,
      isGroupMember: true,
    });
    expect(prisma.event.findUnique).toHaveBeenCalledWith({
      where: { id: EVENT_ID },
      select: {
        proposals: { select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        group: {
          select: { users: { where: { userId: USER_ID }, select: { userId: true }, take: 1 } },
        },
      },
    });
  });

  it('returns null for an unknown event and a null proposal when the event has none', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      proposals: [],
      group: { users: [] },
    });

    await expect(repository.findEventProposalContext(EVENT_ID, USER_ID)).resolves.toBeNull();
    await expect(repository.findEventProposalContext(EVENT_ID, USER_ID)).resolves.toEqual({
      proposalId: null,
      isGroupMember: false,
    });
  });

  it('maps a unique constraint violation to ProposalResponseAlreadyExistsError', async () => {
    prisma.proposalResponse.create.mockRejectedValue(knownError('P2002'));

    await expect(
      repository.create({
        proposalId: PROPOSAL_ID,
        userId: USER_ID,
        answer: 'yes',
        createdAt: record.createdAt,
      })
    ).rejects.toBeInstanceOf(ProposalResponseAlreadyExistsError);
  });

  it('updates the answer by proposal and user', async () => {
    prisma.proposalResponse.update.mockResolvedValue({ ...record, answer: 'no' });

    await expect(repository.updateAnswer(PROPOSAL_ID, USER_ID, 'no')).resolves.toEqual({
      ...record,
      answer: 'no',
    });
    expect(prisma.proposalResponse.update).toHaveBeenCalledWith({
      where: { proposalId_userId: { proposalId: PROPOSAL_ID, userId: USER_ID } },
      data: { answer: 'no' },
    });
  });

  it('returns null when there is no response to update', async () => {
    prisma.proposalResponse.update.mockRejectedValue(knownError('P2025'));

    await expect(repository.updateAnswer(PROPOSAL_ID, USER_ID, 'no')).resolves.toBeNull();
  });

  it('rethrows unexpected Prisma errors', async () => {
    const error = knownError('P1001');
    prisma.proposalResponse.update.mockRejectedValue(error);

    await expect(repository.updateAnswer(PROPOSAL_ID, USER_ID, 'no')).rejects.toBe(error);
  });
});
