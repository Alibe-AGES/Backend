import { Injectable, NotFoundException } from '@nestjs/common';
import { ProposalRepository } from '../domain/proposal.entity.repository';
import { ProposalDto } from '../http/dto/proposal-dto';

@Injectable()
export class GetProposalByGroupUseCase {
  constructor(private readonly proposalRepository: ProposalRepository) {}

  async execute(groupId: string, userId: string): Promise<ProposalDto[]> {
    const proposals = await this.proposalRepository.findProposalsByGroup(groupId, userId);

    if (!proposals) throw new NotFoundException();

    return proposals;
  }
}
