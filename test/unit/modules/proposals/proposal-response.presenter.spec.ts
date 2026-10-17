import type { CreatedLocationProposal } from '../../../../src/modules/events/domain/event.repository';
import { ProposalResponsePresenter } from '../../../../src/modules/proposals/http/presenters/proposal-response.presenter';

describe('ProposalResponsePresenter', () => {
  const proposal: CreatedLocationProposal = {
    id: 'proposal-id',
    createdAt: new Date('2026-10-09T17:00:00.000Z'),
    owner: { id: 'owner-id', name: 'Ana', image: 'private-storage-key' },
    event: {
      id: 'event-id',
      name: 'Café',
      timeslot: new Date('2026-10-17T00:05:00.000Z'),
      budgetStart: null,
      budgetEnd: '60.00',
      status: 'pending',
      groupId: 'group-id',
    },
    location: { id: 'location-id', description: null, address: null },
    myAnswer: 'yes',
  };

  it('returns the task contract with UTC date/time and a public profile URL', () => {
    expect(ProposalResponsePresenter.toResponse(proposal)).toEqual({
      id: 'proposal-id',
      createdAt: proposal.createdAt,
      owner: { id: 'owner-id', name: 'Ana', image: '/users/owner-id/profile-picture' },
      event: {
        id: 'event-id',
        name: 'Café',
        date: '2026-10-17',
        time: '00:05',
        budgetStart: null,
        budgetEnd: '60.00',
        status: 'pending',
        groupId: 'group-id',
      },
      location: { id: 'location-id', description: null, address: null },
      myAnswer: 'yes',
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
