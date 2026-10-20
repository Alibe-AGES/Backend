import type { CreatedLocationProposal } from '../../../events/domain/event.repository';
import type { CreatedProposalResponseDto } from '../dto/created-proposal-response.dto';

export class ProposalResponsePresenter {
  static toResponse(proposal: CreatedLocationProposal): CreatedProposalResponseDto {
    return {
      id: proposal.id,
      createdAt: proposal.createdAt,
      owner: {
        id: proposal.owner.id,
        name: proposal.owner.name,
        image: proposal.owner.image ? `/users/${proposal.owner.id}/profile-picture` : null,
      },
      event: {
        id: proposal.event.id,
        name: proposal.event.name,
        date: proposal.event.timeslot.toISOString().slice(0, 10),
        time: proposal.event.timeslot.toISOString().slice(11, 16),
        budgetStart: proposal.event.budgetStart,
        budgetEnd: proposal.event.budgetEnd,
        status: proposal.event.status,
        groupId: proposal.event.groupId,
      },
      location: {
        id: proposal.location.id,
        description: proposal.location.description,
        address: proposal.location.address,
      },
      myAnswer: proposal.myAnswer,
    };
  }
}
