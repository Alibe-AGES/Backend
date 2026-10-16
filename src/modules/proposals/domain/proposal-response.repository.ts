import { ProposalResponse, type UserProposalAnswer } from './proposal-response.entity';

export interface EventProposalContext {
  proposalId: string | null;
  isGroupMember: boolean;
}

export interface CreateProposalResponseData {
  proposalId: string;
  userId: string;
  answer: UserProposalAnswer;
  createdAt: Date;
}

export class ProposalResponseAlreadyExistsError extends Error {}

export abstract class ProposalResponseRepository {
  abstract findEventProposalContext(
    eventId: string,
    userId: string
  ): Promise<EventProposalContext | null>;

  abstract create(data: CreateProposalResponseData): Promise<ProposalResponse>;

  abstract updateAnswer(
    proposalId: string,
    userId: string,
    answer: UserProposalAnswer
  ): Promise<ProposalResponse | null>;
}
