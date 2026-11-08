import { Injectable } from '@nestjs/common';
import { type ProposalDetails, ProposalRepository } from '../domain/proposal.repository';

export class ProposalDetailsNotFoundError extends Error {}
export class ProposalDetailsAccessDeniedError extends Error {}

@Injectable()
export class GetProposalByIdUseCase {
  constructor(private readonly proposals: ProposalRepository) {}

  async execute(proposalId: string, userId: string): Promise<ProposalDetails> {
    const access = await this.proposals.findDetails(proposalId, userId);
    if (!access) throw new ProposalDetailsNotFoundError('Proposta não encontrada');
    if (!access.userIsMember) {
      throw new ProposalDetailsAccessDeniedError('O usuário não pertence ao grupo da proposta');
    }
    return access.proposal;
  }
}
