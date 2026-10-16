import { ProposalDto } from '../http/dto/proposal-dto';

export abstract class ProposalRepository {
  abstract findProposalsByGroup(groupId: string, userId: string): Promise<ProposalDto[]>;
}
