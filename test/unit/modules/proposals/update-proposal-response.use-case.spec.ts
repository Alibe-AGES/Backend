import { ProposalAccessDeniedError } from '../../../../src/modules/proposals/application/resolve-proposal';
import {
  ProposalResponseNotFoundError,
  UpdateProposalResponseUseCase,
} from '../../../../src/modules/proposals/application/update-proposal-response.use-case';
import { InMemoryProposalResponseRepository } from '../../../helpers/in-memory-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const SUGGESTION_ID = '77777777-7777-4777-8777-777777777777';
const LOCATION_ID = '88888888-8888-4888-8888-888888888888';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';
const createdAt = new Date('2026-09-22T18:30:00.000Z');

describe('UpdateProposalResponseUseCase', () => {
  let responses: InMemoryProposalResponseRepository;
  let useCase: UpdateProposalResponseUseCase;

  beforeEach(() => {
    responses = new InMemoryProposalResponseRepository();
    responses.setEvent(EVENT_ID, PROPOSAL_ID, [USER_ID]);
    useCase = new UpdateProposalResponseUseCase(responses);
  });

  it('changes the answer and keeps the original identity and creation date', async () => {
    const original = await responses.create({
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes',
      createdAt,
    });

    const result = await useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'no' });

    expect(result).toEqual({ response: { ...original.response, answer: 'no' }, matched: false });
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

  describe('by suggestion', () => {
    beforeEach(async () => {
      responses.setSuggestion(SUGGESTION_ID, [OWNER_ID, USER_ID], LOCATION_ID);
      await responses.create({
        proposalId: SUGGESTION_ID,
        userId: OWNER_ID,
        answer: 'yes',
        createdAt,
      });
      await responses.create({
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'no',
        createdAt,
      });
    });

    it('reports the match when changing the last refusal to an acceptance', async () => {
      const result = await useCase.execute({
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'yes',
      });

      expect(result).toMatchObject({ matched: true, response: { answer: 'yes' } });
      expect(responses.matchNotifications).toHaveLength(1);
    });

    it('does not report a second match after the suggestion already matched', async () => {
      await useCase.execute({ proposalId: SUGGESTION_ID, userId: USER_ID, answer: 'yes' });
      await useCase.execute({ proposalId: SUGGESTION_ID, userId: USER_ID, answer: 'no' });

      const result = await useCase.execute({
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'yes',
      });

      expect(result.matched).toBe(false);
      expect(responses.matchNotifications).toHaveLength(1);
    });
  });
});
