import { ProposalResponse } from './proposal-response.entity';

export interface ProposalProps {
  id?: string;
  eventId: string;
  ownerId: string;
  createdAt?: Date;
  responses?: ProposalResponse[];
}

export class Proposal {
  readonly id: string;
  readonly eventId: string;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly responses: ProposalResponse[];

  constructor(props: ProposalProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.eventId = props.eventId;
    this.ownerId = props.ownerId;
    this.createdAt = props.createdAt ?? new Date();
    this.responses = props.responses ?? [];
  }
}
