import { Injectable } from '@nestjs/common';
import { type UserProposalAnswer } from '../domain/proposal-response.entity';
import {
  type ProposalAnswerResult,
  ProposalResponseRepository,
} from '../domain/proposal-response.repository';
import { type ProposalTarget, resolveProposalId } from './resolve-proposal';

export type UpdateProposalResponseInput = ProposalTarget & {
  userId: string;
  answer: UserProposalAnswer;
};

export class ProposalResponseNotFoundError extends Error {}

@Injectable()
export class UpdateProposalResponseUseCase {
  constructor(private readonly responses: ProposalResponseRepository) {}

  async execute(input: UpdateProposalResponseInput): Promise<ProposalAnswerResult> {
    const proposalId = await resolveProposalId(this.responses, input, input.userId);

    const updated = await this.responses.updateAnswer(
      proposalId,
      input.userId,
      input.answer,
      new Date()
    );

    if (!updated) {
      throw new ProposalResponseNotFoundError('O usuário ainda não respondeu a proposta');
    }

    return updated;
  }
}
