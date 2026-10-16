import { ProposalRepository } from '../../src/modules/proposals/domain/proposal.entity.repository';
import { ProposalDto } from '../../src/modules/proposals/http/dto/proposal-dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryProposalRepository extends ProposalRepository {
  private groupsData: Map<string, { memberIds: string[]; proposals: ProposalDto[] }> = new Map();

  setGroupData(groupId: string, memberIds: string[], proposals: ProposalDto[]): void {
    this.groupsData.set(groupId, { memberIds, proposals });
  }

  clear(): void {
    this.groupsData.clear();
  }

  async findProposalsByGroup(groupId: string, userId: string): Promise<ProposalDto[]> {
    const groupRecord = this.groupsData.get(groupId);

    if (!groupRecord || !groupRecord.memberIds.includes(userId)) {
      return [];
    }
    return groupRecord.proposals;
  }
}
