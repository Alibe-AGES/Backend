import {
  isProposalMatch,
  type ProposalType,
} from '../../src/modules/proposals/domain/proposal-match';
import {
  ProposalResponse,
  type UserProposalAnswer,
} from '../../src/modules/proposals/domain/proposal-response.entity';
import {
  type CreateProposalResponseData,
  type EventProposalContext,
  type ProposalAnswerResult,
  type ProposalContext,
  ProposalResponseAlreadyExistsError,
  ProposalResponseRepository,
} from '../../src/modules/proposals/domain/proposal-response.repository';

interface StoredEvent {
  proposalId: string | null;
  memberIds: Set<string>;
}

interface StoredProposal {
  type: ProposalType;
  memberIds: Set<string>;
  matchedAt: Date | null;
}

export class InMemoryProposalResponseRepository extends ProposalResponseRepository {
  private readonly events = new Map<string, StoredEvent>();
  private readonly proposals = new Map<string, StoredProposal>();
  private readonly responses = new Map<string, ProposalResponse>();
  /** Notificações `match` registradas, na ordem em que ocorreram. */
  readonly matchNotifications: Array<{ proposalId: string; createdAt: Date }> = [];
  private nextId = 1;

  findEventProposalContext(eventId: string, userId: string): Promise<EventProposalContext | null> {
    const event = this.events.get(eventId);

    return Promise.resolve(
      event ? { proposalId: event.proposalId, isGroupMember: event.memberIds.has(userId) } : null
    );
  }

  findProposalContext(proposalId: string, userId: string): Promise<ProposalContext | null> {
    const proposal = this.proposals.get(proposalId);

    return Promise.resolve(proposal ? { isGroupMember: proposal.memberIds.has(userId) } : null);
  }

  create(data: CreateProposalResponseData): Promise<ProposalAnswerResult> {
    const key = responseKey(data.proposalId, data.userId);

    if (this.responses.has(key)) {
      return Promise.reject(new ProposalResponseAlreadyExistsError('Already answered'));
    }

    const response = new ProposalResponse({
      id: `66666666-6666-4666-8666-${String(this.nextId++).padStart(12, '0')}`,
      ...data,
    });
    this.responses.set(key, response);
    return Promise.resolve({
      response,
      matched: this.registerMatchIfComplete(data.proposalId, data.createdAt),
    });
  }

  updateAnswer(
    proposalId: string,
    userId: string,
    answer: UserProposalAnswer,
    answeredAt: Date
  ): Promise<ProposalAnswerResult | null> {
    const key = responseKey(proposalId, userId);
    const current = this.responses.get(key);

    if (!current) {
      return Promise.resolve(null);
    }

    const response = new ProposalResponse({ ...current, answer });
    this.responses.set(key, response);
    return Promise.resolve({
      response,
      matched: this.registerMatchIfComplete(proposalId, answeredAt),
    });
  }

  setEvent(eventId: string, proposalId: string | null, memberIds: string[]): void {
    this.events.set(eventId, { proposalId, memberIds: new Set(memberIds) });
    if (proposalId) {
      this.proposals.set(proposalId, {
        type: 'event',
        memberIds: new Set(memberIds),
        matchedAt: null,
      });
    }
  }

  setSuggestion(proposalId: string, memberIds: string[]): void {
    this.proposals.set(proposalId, {
      type: 'suggestion',
      memberIds: new Set(memberIds),
      matchedAt: null,
    });
  }

  clear(): void {
    this.events.clear();
    this.proposals.clear();
    this.responses.clear();
    this.matchNotifications.length = 0;
    this.nextId = 1;
  }

  private registerMatchIfComplete(proposalId: string, matchedAt: Date): boolean {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      return false;
    }

    const acceptedUserIds = [...this.responses.values()]
      .filter((response) => response.proposalId === proposalId && response.answer === 'yes')
      .map((response) => response.userId);
    const matched = isProposalMatch({
      type: proposal.type,
      matchedAt: proposal.matchedAt,
      memberIds: [...proposal.memberIds],
      acceptedUserIds,
    });

    if (matched) {
      proposal.matchedAt = matchedAt;
      this.matchNotifications.push({ proposalId, createdAt: matchedAt });
    }

    return matched;
  }
}

function responseKey(proposalId: string, userId: string): string {
  return `${proposalId}:${userId}`;
}
