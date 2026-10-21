import type { CreatedSuggestion } from '../../domain/proposal.repository';
import type { CreatedProposalResponseDto } from '../dto/created-proposal-response.dto';

export class ProposalResponsePresenter {
  static toResponse(proposal: CreatedSuggestion): CreatedProposalResponseDto {
    return {
      id: proposal.id,
      type: proposal.type,
      groupId: proposal.groupId,
      name: proposal.name,
      createdAt: proposal.createdAt,
      owner: {
        id: proposal.owner.id,
        name: proposal.owner.name,
        image: proposal.owner.image ? `/users/${proposal.owner.id}/profile-picture` : null,
      },
      location: {
        id: proposal.location.id,
        externalId: proposal.location.externalId,
        name: proposal.location.name,
        description: proposal.location.description,
        address: proposal.location.address,
        openingHours: proposal.location.openingHours,
        rating: proposal.location.rating,
        phoneNumber: proposal.location.phoneNumber,
        website: proposal.location.website,
        priceRange: proposal.location.priceRange,
        imageUrl: proposal.location.image ? `/api/locations/${proposal.location.id}/image` : null,
        manuallyCreated: proposal.location.manuallyCreated,
      },
      myAnswer: proposal.myAnswer,
      matched: proposal.matched,
    };
  }
}
