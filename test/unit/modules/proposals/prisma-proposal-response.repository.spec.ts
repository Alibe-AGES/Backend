import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { ProposalResponseAlreadyExistsError } from '../../../../src/modules/proposals/domain/proposal-response.repository';
import { PrismaProposalResponseRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const ANSWERED_AT = new Date('2026-10-20T12:00:00.000Z');
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

function suggestion(acceptedUserIds: string[]) {
  return {
    type: 'suggestion',
    name: 'Café',
    matchedAt: null,
    groupId: 'group-id',
    group: { users: [{ userId: OWNER_ID }, { userId: USER_ID }] },
    responses: acceptedUserIds.map((userId) => ({ userId })),
  };
}

describe('PrismaProposalResponseRepository', () => {
  const transaction = {
    $queryRaw: jest.fn(),
    proposal: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    proposalResponse: { create: jest.fn(), update: jest.fn() },
    groupNotification: { create: jest.fn() },
  };
  const prisma = {
    event: { findUnique: jest.fn() },
    proposal: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const repository = new PrismaProposalResponseRepository(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: typeof transaction) => unknown) =>
      callback(transaction)
    );
    transaction.proposal.findUniqueOrThrow.mockResolvedValue(suggestion([OWNER_ID]));
  });

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

  it.each([
    [null, null],
    [{ group: { users: [] } }, { isGroupMember: false }],
    [{ group: { users: [{ userId: USER_ID }] } }, { isGroupMember: true }],
  ])('maps the proposal lookup %p to the context %p', async (proposal, expected) => {
    prisma.proposal.findUnique.mockResolvedValue(proposal);

    await expect(repository.findProposalContext(PROPOSAL_ID, USER_ID)).resolves.toEqual(expected);
    expect(prisma.proposal.findUnique).toHaveBeenCalledWith({
      where: { id: PROPOSAL_ID },
      select: {
        group: {
          select: { users: { where: { userId: USER_ID }, select: { userId: true }, take: 1 } },
        },
      },
    });
  });

  it('locks the proposal, stores the response and reports the match it completed', async () => {
    transaction.proposalResponse.create.mockResolvedValue(record);
    transaction.proposal.findUniqueOrThrow.mockResolvedValue(suggestion([OWNER_ID, USER_ID]));
    const data = {
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes' as const,
      createdAt: ANSWERED_AT,
    };

    await expect(repository.create(data)).resolves.toEqual({ response: record, matched: true });

    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(transaction.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      transaction.proposalResponse.create.mock.invocationCallOrder[0]
    );
    expect(transaction.proposalResponse.create).toHaveBeenCalledWith({ data });
    expect(transaction.groupNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'match',
        proposalId: PROPOSAL_ID,
        createdAt: ANSWERED_AT,
      }),
      select: { id: true },
    });
  });

  it('stores the response without match while another member has not accepted', async () => {
    transaction.proposalResponse.create.mockResolvedValue(record);

    await expect(
      repository.create({
        proposalId: PROPOSAL_ID,
        userId: USER_ID,
        answer: 'yes',
        createdAt: ANSWERED_AT,
      })
    ).resolves.toEqual({ response: record, matched: false });
    expect(transaction.groupNotification.create).not.toHaveBeenCalled();
  });

  it('maps a unique constraint violation to ProposalResponseAlreadyExistsError', async () => {
    transaction.proposalResponse.create.mockRejectedValue(knownError('P2002'));

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
    transaction.proposalResponse.update.mockResolvedValue({ ...record, answer: 'no' });

    await expect(repository.updateAnswer(PROPOSAL_ID, USER_ID, 'no', ANSWERED_AT)).resolves.toEqual(
      { response: { ...record, answer: 'no' }, matched: false }
    );
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(transaction.proposalResponse.update).toHaveBeenCalledWith({
      where: { proposalId_userId: { proposalId: PROPOSAL_ID, userId: USER_ID } },
      data: { answer: 'no' },
    });
  });

  it('reports the match when an updated answer completes the acceptances', async () => {
    transaction.proposalResponse.update.mockResolvedValue(record);
    transaction.proposal.findUniqueOrThrow.mockResolvedValue(suggestion([OWNER_ID, USER_ID]));

    await expect(
      repository.updateAnswer(PROPOSAL_ID, USER_ID, 'yes', ANSWERED_AT)
    ).resolves.toEqual({ response: record, matched: true });
    expect(transaction.proposal.update).toHaveBeenCalledWith({
      where: { id: PROPOSAL_ID },
      data: { matchedAt: ANSWERED_AT },
      select: { id: true },
    });
  });

  it('returns null when there is no response to update', async () => {
    transaction.proposalResponse.update.mockRejectedValue(knownError('P2025'));

    await expect(
      repository.updateAnswer(PROPOSAL_ID, USER_ID, 'no', ANSWERED_AT)
    ).resolves.toBeNull();
  });

  it('rethrows unexpected Prisma errors', async () => {
    const error = knownError('P1001');
    transaction.proposalResponse.update.mockRejectedValue(error);

    await expect(repository.updateAnswer(PROPOSAL_ID, USER_ID, 'no', ANSWERED_AT)).rejects.toBe(
      error
    );
  });
});
