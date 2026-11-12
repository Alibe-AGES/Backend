import { Injectable, Logger } from '@nestjs/common';
import { GroupPushNotificationService } from '../../events/application/group-push-notification.service';
import { type UserProposalAnswer } from '../domain/proposal-response.entity';
import {
  type ProposalAnswerResult,
  ProposalResponseRepository,
} from '../domain/proposal-response.repository';
import { notifyProposalMatch, type ProposalTarget, resolveProposalId } from './resolve-proposal';

export type CreateProposalResponseInput = ProposalTarget & {
  userId: string;
  answer: UserProposalAnswer;
};

@Injectable()
export class CreateProposalResponseUseCase {
  private readonly logger = new Logger(CreateProposalResponseUseCase.name);

  constructor(
    private readonly responses: ProposalResponseRepository,
    private readonly groupNotifications: GroupPushNotificationService
  ) {}

  async execute(input: CreateProposalResponseInput): Promise<ProposalAnswerResult> {
    const proposalId = await resolveProposalId(this.responses, input, input.userId);

    const result = await this.responses.create({
      proposalId,
      userId: input.userId,
      answer: input.answer,
      createdAt: new Date(),
    });

    if (result.matched) {
      await notifyProposalMatch(this.responses, this.groupNotifications, this.logger, proposalId);
    }

    return result;
  }
}
