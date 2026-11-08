export type ProposalType = 'suggestion' | 'event';

export interface ProposalMatchState {
  type: ProposalType;
  matchedAt: Date | null;
  memberIds: string[];
  acceptedUserIds: string[];
}

/** Uma sugestão dá match uma única vez, quando todos os membros atuais do grupo aceitaram. */
export function isProposalMatch(state: ProposalMatchState): boolean {
  if (state.type !== 'suggestion' || state.matchedAt !== null || state.memberIds.length === 0) {
    return false;
  }

  const accepted = new Set(state.acceptedUserIds);
  return state.memberIds.every((memberId) => accepted.has(memberId));
}

// group_notification.message é VARCHAR(255); o nome é cortado para a mensagem sempre caber.
const MAX_NAME_LENGTH = 120;

export function proposalMatchNotificationMessage(name: string | null): string {
  const shortName =
    name && name.length > MAX_NAME_LENGTH ? `${name.slice(0, MAX_NAME_LENGTH - 1)}…` : name;
  const suggestion = shortName ? `a sugestão "${shortName}"` : 'a sugestão';

  return `Deu match! Todo o grupo aceitou ${suggestion}.`;
}
