import { ProposalResponse, type UserProposalAnswer } from './proposal-response.entity';

export interface EventProposalContext {
  /** Proposta mais recente do evento, ou null quando o evento ainda não possui proposta. */
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
  /** Retorna null quando o evento não existe. */
  abstract findEventProposalContext(
    eventId: string,
    userId: string
  ): Promise<EventProposalContext | null>;

  /** Lança ProposalResponseAlreadyExistsError quando o usuário já respondeu a proposta. */
  abstract create(data: CreateProposalResponseData): Promise<ProposalResponse>;

  /** Retorna null quando o usuário ainda não respondeu a proposta. */
  abstract updateAnswer(
    proposalId: string,
    userId: string,
    answer: UserProposalAnswer
  ): Promise<ProposalResponse | null>;
}
