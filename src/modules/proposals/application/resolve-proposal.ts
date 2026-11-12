import { type Logger } from '@nestjs/common';
import { type GroupPushNotificationService } from '../../events/application/group-push-notification.service';
import { proposalMatchNotificationMessage } from '../domain/proposal-match';
import { ProposalResponseRepository } from '../domain/proposal-response.repository';

export class ProposalEventNotFoundError extends Error {}
export class ProposalNotFoundError extends Error {}
export class ProposalAccessDeniedError extends Error {}
export class ProposalEventAlreadyHappenedError extends Error {}

/** Depois que o evento acontece, a presença fica congelada: ninguém confirma nem cancela. */
function ensureEventHasNotHappened(eventTimeslot: Date | null): void {
  if (eventTimeslot && eventTimeslot.getTime() <= Date.now()) {
    throw new ProposalEventAlreadyHappenedError(
      'O evento já aconteceu; a presença não pode mais ser alterada'
    );
  }
}

/** A proposta é encontrada pelo evento ao qual pertence ou diretamente, no caso de sugestões. */
export type ProposalTarget = { eventId: string } | { proposalId: string };

export async function resolveProposalId(
  responses: ProposalResponseRepository,
  target: ProposalTarget,
  userId: string
): Promise<string> {
  if ('proposalId' in target) {
    const context = await responses.findProposalContext(target.proposalId, userId);

    if (!context) {
      throw new ProposalNotFoundError('Proposta não encontrada');
    }

    if (!context.isGroupMember) {
      throw new ProposalAccessDeniedError('O usuário não pertence ao grupo da proposta');
    }

    ensureEventHasNotHappened(context.eventTimeslot);

    return target.proposalId;
  }

  const context = await responses.findEventProposalContext(target.eventId, userId);

  if (!context) {
    throw new ProposalEventNotFoundError('Evento não encontrado');
  }

  if (!context.isGroupMember) {
    throw new ProposalAccessDeniedError('O usuário não pertence ao grupo do evento');
  }

  if (!context.proposalId) {
    throw new ProposalNotFoundError('O evento não possui proposta');
  }

  ensureEventHasNotHappened(context.eventTimeslot);

  return context.proposalId;
}

/**
 * Avisa por push todos os membros do grupo que a sugestão deu match. O match já foi salvo
 * quando isto roda, então uma falha aqui só vai para o log e não desfaz a resposta.
 */
export async function notifyProposalMatch(
  responses: ProposalResponseRepository,
  groupNotifications: GroupPushNotificationService,
  logger: Logger,
  proposalId: string
): Promise<void> {
  try {
    const proposal = await responses.findProposalGroup(proposalId);

    if (!proposal) {
      return;
    }

    await groupNotifications.sendToGroup(proposal.groupId, {
      title: 'Deu match!',
      body: proposalMatchNotificationMessage(proposal.name),
      data: { type: 'match', proposalId, groupId: proposal.groupId },
    });
  } catch (error) {
    logger.error(
      `Match da proposta ${proposalId} registrado, mas o push não pôde ser enviado`,
      error instanceof Error ? error.stack : undefined
    );
  }
}
