import { Prisma } from '../../../../generated/prisma/client';
import {
  lockProposal,
  registerMatchIfComplete,
} from '../../../../src/modules/proposals/persistence/proposal-match.transaction';

const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const MATCHED_AT = new Date('2026-10-20T12:00:00.000Z');

function setup(proposal: Record<string, unknown>) {
  const transaction = {
    $queryRaw: jest.fn(),
    proposal: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        type: 'suggestion',
        name: 'Café',
        matchedAt: null,
        groupId: 'group-id',
        locationId: 'location-id',
        group: { users: [{ userId: 'ana' }, { userId: 'bruno' }] },
        responses: [{ userId: 'ana' }, { userId: 'bruno' }],
        ...proposal,
      }),
      update: jest.fn(),
    },
    groupNotification: { create: jest.fn() },
  };
  return { transaction, tx: transaction as unknown as Prisma.TransactionClient };
}

describe('proposal match transaction', () => {
  it('locks the proposal row with SELECT ... FOR UPDATE', async () => {
    const { transaction, tx } = setup({});

    await lockProposal(tx, PROPOSAL_ID);

    const [sql, ...values] = transaction.$queryRaw.mock.calls[0];
    expect(sql.join('?')).toBe('SELECT "id" FROM "proposal" WHERE "id" = ?::uuid FOR UPDATE');
    expect(values).toEqual([PROPOSAL_ID]);
  });

  it('marks the match and creates a match notification that references the proposal', async () => {
    const { transaction, tx } = setup({});

    await expect(registerMatchIfComplete(tx, PROPOSAL_ID, MATCHED_AT)).resolves.toBe(true);

    expect(transaction.proposal.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: PROPOSAL_ID },
      select: {
        type: true,
        name: true,
        matchedAt: true,
        groupId: true,
        locationId: true,
        group: { select: { users: { select: { userId: true } } } },
        responses: { where: { answer: 'yes' }, select: { userId: true } },
      },
    });
    expect(transaction.proposal.update).toHaveBeenCalledWith({
      where: { id: PROPOSAL_ID },
      data: { matchedAt: MATCHED_AT },
      select: { id: true },
    });
    expect(transaction.groupNotification.create).toHaveBeenCalledWith({
      data: {
        type: 'match',
        message: 'Deu match! Todo o grupo aceitou a sugestão "Café".',
        createdAt: MATCHED_AT,
        groupId: 'group-id',
        locationId: 'location-id',
      },
      select: { id: true },
    });
  });

  it.each([
    ['a member has not accepted', { responses: [{ userId: 'ana' }] }],
    ['the suggestion already matched', { matchedAt: new Date('2026-10-19T12:00:00.000Z') }],
    ['the proposal belongs to an event', { type: 'event' }],
  ])('does not write anything when %s', async (_case, proposal) => {
    const { transaction, tx } = setup(proposal);

    await expect(registerMatchIfComplete(tx, PROPOSAL_ID, MATCHED_AT)).resolves.toBe(false);

    expect(transaction.proposal.update).not.toHaveBeenCalled();
    expect(transaction.groupNotification.create).not.toHaveBeenCalled();
  });
});
