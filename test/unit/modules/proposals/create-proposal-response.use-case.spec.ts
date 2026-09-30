import { CreateProposalResponseUseCase } from '../../../../src/modules/proposals/application/create-proposal-response.use-case';
import {
  ProposalAccessDeniedError,
  ProposalEventNotFoundError,
  ProposalNotFoundError,
} from '../../../../src/modules/proposals/application/resolve-event-proposal';
import { ProposalResponseAlreadyExistsError } from '../../../../src/modules/proposals/domain/proposal-response.repository';
import { InMemoryProposalResponseRepository } from '../../../helpers/in-memory-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';

describe('CreateProposalResponseUseCase', () => {
  let responses: InMemoryProposalResponseRepository;
  let useCase: CreateProposalResponseUseCase;

  beforeEach(() => {
    responses = new InMemoryProposalResponseRepository();
    responses.setEvent(EVENT_ID, PROPOSAL_ID, [USER_ID]);
    useCase = new CreateProposalResponseUseCase(responses);
  });

  it('creates the authenticated user response for the event proposal', async () => {
    const result = await useCase.execute({ eventId: EVENT_ID, userId: USER_ID, answer: 'no' });

    expect(result).toMatchObject({ proposalId: PROPOSAL_ID, userId: USER_ID, answer: 'no' });
    expect(result.createdAt).toBeInstanceOf(Date);
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
