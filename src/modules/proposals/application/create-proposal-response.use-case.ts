import { Injectable } from '@nestjs/common';
import { ProposalResponse, type UserProposalAnswer } from '../domain/proposal-response.entity';
import { ProposalResponseRepository } from '../domain/proposal-response.repository';
import { resolveEventProposalId } from './resolve-event-proposal';

export interface CreateProposalResponseInput {
  eventId: string;
  userId: string;
  answer: UserProposalAnswer;
}

@Injectable()
export class CreateProposalResponseUseCase {
  constructor(private readonly responses: ProposalResponseRepository) {}

  async execute(input: CreateProposalResponseInput): Promise<ProposalResponse> {
    const proposalId = await resolveEventProposalId(this.responses, input.eventId, input.userId);

    return this.responses.create({
      proposalId,
      userId: input.userId,
      answer: input.answer,
      createdAt: new Date(),
    });
  }
}
