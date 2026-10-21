import type { CreatedSuggestion } from '../../../../src/modules/proposals/domain/proposal.repository';
import { ProposalResponsePresenter } from '../../../../src/modules/proposals/http/presenters/proposal-response.presenter';

describe('ProposalResponsePresenter', () => {
  const proposal: CreatedSuggestion = {
    id: 'proposal-id',
    type: 'suggestion',
    groupId: 'group-id',
    name: 'Café',
    createdAt: new Date('2026-10-09T17:00:00.000Z'),
    owner: { id: 'owner-id', name: 'Ana', image: 'private-storage-key' },
    location: {
      id: 'location-id',
      externalId: null,
      name: null,
      description: null,
      address: null,
      openingHours: [],
      rating: null,
      phoneNumber: null,
      website: null,
      priceRange: { start: null, end: null, currencyCode: null },
      image: null,
      manuallyCreated: true,
    },
    myAnswer: 'yes',
    matched: false,
  };

  it('returns the suggestion with a public profile URL', () => {
    expect(ProposalResponsePresenter.toResponse(proposal)).toEqual({
      id: 'proposal-id',
      type: 'suggestion',
      groupId: 'group-id',
      name: 'Café',
      createdAt: proposal.createdAt,
      owner: { id: 'owner-id', name: 'Ana', image: '/users/owner-id/profile-picture' },
      location: {
        id: 'location-id',
        externalId: null,
        name: null,
        description: null,
        address: null,
        openingHours: [],
        rating: null,
        phoneNumber: null,
        website: null,
        priceRange: { start: null, end: null, currencyCode: null },
        imageUrl: null,
        manuallyCreated: true,
      },
      myAnswer: 'yes',
      matched: false,
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
