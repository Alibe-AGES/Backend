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
        description: proposal.location.description,
        address: proposal.location.address,
      },
      myAnswer: proposal.myAnswer,
      matched: proposal.matched,
    };
  }
}
