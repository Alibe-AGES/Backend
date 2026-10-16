import { Injectable } from '@nestjs/common';
import { ProposalResponse, type UserProposalAnswer } from '../domain/proposal-response.entity';
import { ProposalResponseRepository } from '../domain/proposal-response.repository';
import { resolveEventProposalId } from './resolve-event-proposal';

export interface UpdateProposalResponseInput {
  eventId: string;
  userId: string;
  answer: UserProposalAnswer;
}

export class ProposalResponseNotFoundError extends Error {}

@Injectable()
export class UpdateProposalResponseUseCase {
  constructor(private readonly responses: ProposalResponseRepository) {}

  async execute(input: UpdateProposalResponseInput): Promise<ProposalResponse> {
    const proposalId = await resolveEventProposalId(this.responses, input.eventId, input.userId);

    const updated = await this.responses.updateAnswer(proposalId, input.userId, input.answer);

    if (!updated) {
      throw new ProposalResponseNotFoundError('O usuário ainda não respondeu a proposta');
    }

    return updated;
  }
}
