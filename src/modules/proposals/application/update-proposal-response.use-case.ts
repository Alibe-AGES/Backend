import { Injectable, Logger } from '@nestjs/common';
import { GroupPushNotificationService } from '../../events/application/group-push-notification.service';
import { proposalMatchNotificationMessage } from '../domain/proposal-match';
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
  private readonly logger = new Logger(UpdateProposalResponseUseCase.name);

  constructor(
    private readonly responses: ProposalResponseRepository,
    private readonly groupNotifications: GroupPushNotificationService
  ) {}

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

    if (updated.matched) {
      await this.notifyMatch(proposalId);
    }

    return updated;
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
