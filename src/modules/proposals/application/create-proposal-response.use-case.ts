import { Injectable } from '@nestjs/common';
import { type UserProposalAnswer } from '../domain/proposal-response.entity';
import {
  type ProposalAnswerResult,
  ProposalResponseRepository,
} from '../domain/proposal-response.repository';
import { type ProposalTarget, resolveProposalId } from './resolve-proposal';

export type CreateProposalResponseInput = ProposalTarget & {
  userId: string;
  answer: UserProposalAnswer;
};

@Injectable()
export class CreateProposalResponseUseCase {
  constructor(private readonly responses: ProposalResponseRepository) {}

  async execute(input: CreateProposalResponseInput): Promise<ProposalAnswerResult> {
    const proposalId = await resolveProposalId(this.responses, input, input.userId);

    return this.responses.create({
      proposalId,
      userId: input.userId,
      answer: input.answer,
      createdAt: new Date(),
    });
  }
}
