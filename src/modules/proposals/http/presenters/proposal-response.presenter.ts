import type {
  ActiveSuggestion,
  CreatedSuggestion,
  StoredProposalLocation,
} from '../../domain/proposal.repository';
import type { OwnerResponseDto } from '../../../events/http/dto/owner-details-response.dto';
import type { ActiveProposalResponseDto } from '../dto/active-proposal-response.dto';
import type {
  CreatedProposalResponseDto,
  ProposalLocationResponseDto,
} from '../dto/created-proposal-response.dto';

export class ProposalResponsePresenter {
  static toResponse(proposal: CreatedSuggestion): CreatedProposalResponseDto {
    return {
      id: proposal.id,
      type: proposal.type,
      groupId: proposal.groupId,
      name: proposal.name,
      createdAt: proposal.createdAt,
      owner: this.toOwner(proposal.owner),
      location: this.toLocation(proposal.location),
      myAnswer: proposal.myAnswer,
      matched: proposal.matched,
    };
  }

  static toActiveResponse(suggestion: ActiveSuggestion): ActiveProposalResponseDto {
    return {
      id: suggestion.id,
      type: suggestion.type,
      groupId: suggestion.groupId,
      name: suggestion.name,
      createdAt: suggestion.createdAt,
      owner: this.toOwner(suggestion.owner),
      location: suggestion.location && this.toLocation(suggestion.location),
      responses: suggestion.responses,
    };
  }

  private static toOwner(owner: CreatedSuggestion['owner']): OwnerResponseDto {
    return {
      id: owner.id,
      name: owner.name,
      image: owner.image ? `/users/${owner.id}/profile-picture` : null,
    };
  }

  private static toLocation(location: StoredProposalLocation): ProposalLocationResponseDto {
    return {
      id: location.id,
      externalId: location.externalId,
      name: location.name,
      description: location.description,
      address: location.address,
      openingHours: location.openingHours,
      rating: location.rating,
      phoneNumber: location.phoneNumber,
      website: location.website,
      priceRange: location.priceRange,
      imageUrl: location.image ? `/api/locations/${location.id}/image` : null,
      manuallyCreated: location.manuallyCreated,
    };
  }
}
