import { ProposalResponseRepository } from '../domain/proposal-response.repository';

export class ProposalEventNotFoundError extends Error {}
export class ProposalNotFoundError extends Error {}
export class ProposalAccessDeniedError extends Error {}

export async function resolveEventProposalId(
  responses: ProposalResponseRepository,
  eventId: string,
  userId: string
): Promise<string> {
  const context = await responses.findEventProposalContext(eventId, userId);

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
