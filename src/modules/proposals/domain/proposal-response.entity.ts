export type ProposalAnswer = 'pending' | 'yes' | 'no';

/** Respostas que o próprio usuário pode enviar; `pending` é somente estado inicial. */
export type UserProposalAnswer = Exclude<ProposalAnswer, 'pending'>;

export interface ProposalResponseProps {
  id: string;
  proposalId: string;
  userId: string;
  answer: ProposalAnswer;
  createdAt: Date;
}

export class ProposalResponse {
  readonly id: string;
  readonly proposalId: string;
  readonly userId: string;
  readonly answer: ProposalAnswer;
  readonly createdAt: Date;

  constructor(props: ProposalResponseProps) {
    this.id = props.id;
    this.proposalId = props.proposalId;
    this.userId = props.userId;
    this.answer = props.answer;
    this.createdAt = props.createdAt;
  }
}
