import { ProposalAccessDeniedError } from '../../../../src/modules/proposals/application/resolve-event-proposal';
import {
  ProposalResponseNotFoundError,
  UpdateProposalResponseUseCase,
} from '../../../../src/modules/proposals/application/update-proposal-response.use-case';
import { InMemoryProposalResponseRepository } from '../../../helpers/in-memory-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';

describe('UpdateProposalResponseUseCase', () => {
  let responses: InMemoryProposalResponseRepository;
  let useCase: UpdateProposalResponseUseCase;

  beforeEach(() => {
    responses = new InMemoryProposalResponseRepository();
    responses.setEvent(EVENT_ID, PROPOSAL_ID, [USER_ID]);
    useCase = new UpdateProposalResponseUseCase(responses);
  });

  it('changes the answer and keeps the original identity and creation date', async () => {
    const createdAt = new Date('2026-09-22T18:30:00.000Z');
    const original = await responses.create({
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes',
      createdAt,
    });

    const result = await useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'no' });

    expect(result).toEqual({ ...original, answer: 'no' });
  });

  it('rejects a user who has not answered yet', async () => {
    await expect(
      useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'no' })
    ).rejects.toBeInstanceOf(ProposalResponseNotFoundError);
  });

  it('rejects a user outside the event group', async () => {
    await expect(
      useCase.execute({ eventId: EVENT_ID, userId: OUTSIDER_ID, answer: 'no' })
    ).rejects.toBeInstanceOf(ProposalAccessDeniedError);
  });
});
