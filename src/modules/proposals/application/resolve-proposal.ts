import { ProposalResponseRepository } from '../domain/proposal-response.repository';

export class ProposalEventNotFoundError extends Error {}
export class ProposalNotFoundError extends Error {}
export class ProposalAccessDeniedError extends Error {}

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

  return context.proposalId;
}
