import { ProposalResponse, type UserProposalAnswer } from './proposal-response.entity';

export interface EventProposalContext {
  proposalId: string | null;
  isGroupMember: boolean;
}

export interface ProposalContext {
  isGroupMember: boolean;
}

export interface CreateProposalResponseData {
  proposalId: string;
  userId: string;
  answer: UserProposalAnswer;
  createdAt: Date;
}

export interface ProposalAnswerResult {
  response: ProposalResponse;
  /** True somente para a resposta que completou o match da sugestão. */
  matched: boolean;
}

export class ProposalResponseAlreadyExistsError extends Error {}

export abstract class ProposalResponseRepository {
  abstract findEventProposalContext(
    eventId: string,
    userId: string
  ): Promise<EventProposalContext | null>;

  /** Retorna null quando a proposta não existe. */
  abstract findProposalContext(proposalId: string, userId: string): Promise<ProposalContext | null>;

  /**
   * Grava a resposta e, na mesma transação, registra o match e a notificação `match`
   * quando essa resposta completa os aceites de uma sugestão.
   */
  abstract create(data: CreateProposalResponseData): Promise<ProposalAnswerResult>;

  /** Mesmo comportamento de match de `create`; retorna null quando o usuário não respondeu. */
  abstract updateAnswer(
    proposalId: string,
    userId: string,
    answer: UserProposalAnswer,
    answeredAt: Date
  ): Promise<ProposalAnswerResult | null>;
}
