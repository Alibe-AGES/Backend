import type { CreatedSuggestion } from '../../../../src/modules/proposals/domain/proposal.repository';
import { ProposalResponsePresenter } from '../../../../src/modules/proposals/http/presenters/proposal-response.presenter';

describe('ProposalResponsePresenter', () => {
  const proposal: CreatedSuggestion = {
    id: 'proposal-id',
    type: 'suggestion',
    groupId: 'group-id',
    name: 'Café',
    timeslot: new Date('2026-10-17T00:05:00.000Z'),
    budgetStart: null,
    budgetEnd: '60.00',
    createdAt: new Date('2026-10-09T17:00:00.000Z'),
    owner: { id: 'owner-id', name: 'Ana', image: 'private-storage-key' },
    location: { id: 'location-id', description: null, address: null },
    myAnswer: 'yes',
    matched: false,
  };

  it('returns the suggestion with UTC date/time and a public profile URL', () => {
    expect(ProposalResponsePresenter.toResponse(proposal)).toEqual({
      id: 'proposal-id',
      type: 'suggestion',
      groupId: 'group-id',
      name: 'Café',
      date: '2026-10-17',
      time: '00:05',
      budgetStart: null,
      budgetEnd: '60.00',
      createdAt: proposal.createdAt,
      owner: { id: 'owner-id', name: 'Ana', image: '/users/owner-id/profile-picture' },
      location: { id: 'location-id', description: null, address: null },
      myAnswer: 'yes',
      matched: false,
    });
  });

  it('returns null date and time for a suggestion without timeslot', () => {
    expect(ProposalResponsePresenter.toResponse({ ...proposal, timeslot: null })).toMatchObject({
      date: null,
      time: null,
    });
  });

  it('returns null when the owner has no profile picture', () => {
    expect(
      ProposalResponsePresenter.toResponse({
        ...proposal,
        owner: { ...proposal.owner, image: null },
      }).owner.image
    ).toBeNull();
  });
});
