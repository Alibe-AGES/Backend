import { Injectable } from '@nestjs/common';
import { type ActiveSuggestion, ProposalRepository } from '../domain/proposal.repository';

export class ActiveProposalsGroupNotFoundError extends Error {}
export class ActiveProposalsAccessDeniedError extends Error {}

@Injectable()
export class ListActiveProposalsUseCase {
  constructor(private readonly proposals: ProposalRepository) {}

  async execute(groupId: string, userId: string): Promise<ActiveSuggestion[]> {
    const membership = await this.proposals.findGroupMembership(groupId, userId);
    if (membership === null) throw new ActiveProposalsGroupNotFoundError('Grupo não encontrado');
    if (!membership) {
      throw new ActiveProposalsAccessDeniedError('O usuário não pertence a este grupo');
    }
    return this.proposals.findActiveSuggestions(groupId, userId);
  }
}
