import { Prisma } from '../../../../generated/prisma/client';
import { isProposalMatch, proposalMatchNotificationMessage } from '../domain/proposal-match';

/**
 * Serializa as respostas de uma mesma proposta. Sem o lock, dois últimos aceites simultâneos
 * poderiam não enxergar um ao outro (nenhum match) ou ambos registrarem o match.
 */
export async function lockProposal(
  transaction: Prisma.TransactionClient,
  proposalId: string
): Promise<void> {
  await transaction.$queryRaw`SELECT "id" FROM "proposal" WHERE "id" = ${proposalId}::uuid FOR UPDATE`;
}

/** Registra o match e a notificação do grupo quando todos os membros atuais aceitaram. */
export async function registerMatchIfComplete(
  transaction: Prisma.TransactionClient,
  proposalId: string,
  matchedAt: Date
): Promise<boolean> {
  const proposal = await transaction.proposal.findUniqueOrThrow({
    where: { id: proposalId },
    select: {
      type: true,
      name: true,
      matchedAt: true,
      groupId: true,
      group: { select: { users: { select: { userId: true } } } },
      responses: { where: { answer: 'yes' }, select: { userId: true } },
    },
  });

  const matched = isProposalMatch({
    type: proposal.type,
    matchedAt: proposal.matchedAt,
    memberIds: proposal.group.users.map(({ userId }) => userId),
    acceptedUserIds: proposal.responses.map(({ userId }) => userId),
  });

  if (!matched) {
    return false;
  }

  await transaction.proposal.update({
    where: { id: proposalId },
    data: { matchedAt },
    select: { id: true },
  });
  await transaction.groupNotification.create({
    data: {
      type: 'match',
      message: proposalMatchNotificationMessage(proposal.name),
      createdAt: matchedAt,
      groupId: proposal.groupId,
      proposalId,
    },
    select: { id: true },
  });

  return true;
}
