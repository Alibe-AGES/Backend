import { Injectable, Logger } from '@nestjs/common';
import { GroupPushNotificationService } from '../../events/application/group-push-notification.service';
import { proposalMatchNotificationMessage } from '../domain/proposal-match';
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
      await this.notifyMatch(proposalId);
    }

    return result;
  }

  private async notifyMatch(proposalId: string): Promise<void> {
    try {
      const proposal = await this.responses.findProposalGroup(proposalId);

      if (!proposal) {
        return;
      }

      await this.groupNotifications.sendToGroup(proposal.groupId, {
        title: 'Deu match!',
        body: proposalMatchNotificationMessage(proposal.name),
        data: { type: 'match', proposalId, groupId: proposal.groupId },
      });
    } catch (error) {
      this.logger.error(
        `Match da proposta ${proposalId} registrado, mas o push não pôde ser enviado`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}
