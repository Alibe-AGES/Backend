import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProposalRepository } from '../domain/proposal.entity.repository';
import { ProposalDto } from '../http/dto/proposal-dto';
import { ListGroupsUseCase } from '../../../../src/modules/groups/application/list-groups.use-case';
import { Group } from '../../../../generated/prisma/browser';
import { GetGroupUseCase } from '../../../../src/modules/groups/application/get-group.use-case';

@Injectable()
export class GetProposalByGroupUseCase {
  constructor(
    private readonly proposalRepository: ProposalRepository,
    private readonly listGroupsUseCase: ListGroupsUseCase,
    private readonly getGroupUseCase: GetGroupUseCase
  ) {}

  async execute(groupId: string, userId: string): Promise<ProposalDto[]> {
    const group = await this.getGroupUseCase.execute(groupId);

    if (!group) {
      throw new NotFoundException('Grupo inexistente.');
    }

    const groups = await this.listGroupsUseCase.execute(userId);

    const isInGroup = groups.some((g: Group) => g.id === groupId);

    if (!isInGroup) {
      throw new ForbiddenException('Usuário não pertence ao respectivo grupo.');
    }

    const proposals = await this.proposalRepository.findProposalsByGroup(groupId, userId);

    if (!proposals) throw new NotFoundException();

    return proposals;
  }
}
