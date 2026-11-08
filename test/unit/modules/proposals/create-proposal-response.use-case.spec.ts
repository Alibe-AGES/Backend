import { CreateProposalResponseUseCase } from '../../../../src/modules/proposals/application/create-proposal-response.use-case';
import {
  ProposalAccessDeniedError,
  ProposalEventNotFoundError,
  ProposalNotFoundError,
} from '../../../../src/modules/proposals/application/resolve-proposal';
import { ProposalResponseAlreadyExistsError } from '../../../../src/modules/proposals/domain/proposal-response.repository';
import { InMemoryProposalResponseRepository } from '../../../helpers/in-memory-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const SUGGESTION_ID = '77777777-7777-4777-8777-777777777777';
const LOCATION_ID = '88888888-8888-4888-8888-888888888888';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';

describe('CreateProposalResponseUseCase', () => {
  let responses: InMemoryProposalResponseRepository;
  let useCase: CreateProposalResponseUseCase;

  beforeEach(() => {
    responses = new InMemoryProposalResponseRepository();
    responses.setEvent(EVENT_ID, PROPOSAL_ID, [USER_ID]);
    useCase = new CreateProposalResponseUseCase(responses);
  });

  describe('by event', () => {
    it('creates the authenticated user response for the event proposal', async () => {
      const result = await useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'no' });

      expect(result.response).toMatchObject({
        proposalId: PROPOSAL_ID,
        userId: USER_ID,
        answer: 'no',
      });
      expect(result.response.createdAt).toBeInstanceOf(Date);
    });

    it('never reports a match for a proposal that already has an event', async () => {
      const result = await useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'yes' });

      expect(result.matched).toBe(false);
      expect(responses.matchNotifications).toEqual([]);
    });

    it('rejects a second response from the same user', async () => {
      await useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'yes' });

      await expect(
        useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'no' })
      ).rejects.toBeInstanceOf(ProposalResponseAlreadyExistsError);
    });

    it('rejects an unknown event', async () => {
      await expect(
        useCase.execute({
          eventId: '00000000-0000-4000-8000-000000000000',
          userId: USER_ID,
          answer: 'yes',
        })
      ).rejects.toBeInstanceOf(ProposalEventNotFoundError);
    });

    it('rejects a user outside the event group', async () => {
      await expect(
        useCase.execute({ eventId: EVENT_ID, userId: OUTSIDER_ID, answer: 'yes' })
      ).rejects.toBeInstanceOf(ProposalAccessDeniedError);
    });

    it('rejects an event without proposal', async () => {
      responses.setEvent(EVENT_ID, null, [USER_ID]);

      await expect(
        useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'yes' })
      ).rejects.toBeInstanceOf(ProposalNotFoundError);
    });
  });

  describe('by suggestion', () => {
    beforeEach(async () => {
      responses.setSuggestion(SUGGESTION_ID, [OWNER_ID, USER_ID], LOCATION_ID);
      await responses.create({
        proposalId: SUGGESTION_ID,
        userId: OWNER_ID,
        answer: 'yes',
        createdAt: new Date('2026-10-20T10:00:00.000Z'),
      });
    });

    it('reports the match to the last member who accepts and records the notification', async () => {
      const result = await useCase.execute({
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'yes',
      });

      expect(result.matched).toBe(true);
      expect(result.response).toMatchObject({ proposalId: SUGGESTION_ID, answer: 'yes' });
      expect(responses.matchNotifications).toEqual([
        { locationId: LOCATION_ID, createdAt: result.response.createdAt },
      ]);
    });

    it('stores the acceptance without a match while other members still have to accept', async () => {
      responses.setSuggestion(SUGGESTION_ID, [OWNER_ID, USER_ID, OUTSIDER_ID], LOCATION_ID);

      const result = await useCase.execute({
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'yes',
      });

      expect(result).toMatchObject({ matched: false, response: { answer: 'yes' } });
      expect(responses.matchNotifications).toEqual([]);
    });

    it('does not match when the last member refuses', async () => {
      const result = await useCase.execute({
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'no',
      });

      expect(result.matched).toBe(false);
      expect(responses.matchNotifications).toEqual([]);
    });

    it('rejects an unknown proposal', async () => {
      await expect(
        useCase.execute({
          proposalId: '00000000-0000-4000-8000-000000000000',
          userId: USER_ID,
          answer: 'yes',
        })
      ).rejects.toBeInstanceOf(ProposalNotFoundError);
    });

    it('rejects a user outside the proposal group', async () => {
      await expect(
        useCase.execute({ proposalId: SUGGESTION_ID, userId: OUTSIDER_ID, answer: 'yes' })
      ).rejects.toBeInstanceOf(ProposalAccessDeniedError);
    });
  });
});
