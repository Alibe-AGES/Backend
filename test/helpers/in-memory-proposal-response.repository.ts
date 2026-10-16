import {
  ProposalResponse,
  type UserProposalAnswer,
} from '../../src/modules/proposals/domain/proposal-response.entity';
import {
  type CreateProposalResponseData,
  type EventProposalContext,
  ProposalResponseAlreadyExistsError,
  ProposalResponseRepository,
} from '../../src/modules/proposals/domain/proposal-response.repository';

interface StoredEvent {
  proposalId: string | null;
  memberIds: Set<string>;
}

export class InMemoryProposalResponseRepository extends ProposalResponseRepository {
  private readonly events = new Map<string, StoredEvent>();
  private readonly responses = new Map<string, ProposalResponse>();
  private nextId = 1;

  findEventProposalContext(eventId: string, userId: string): Promise<EventProposalContext | null> {
    const event = this.events.get(eventId);

    return Promise.resolve(
      event ? { proposalId: event.proposalId, isGroupMember: event.memberIds.has(userId) } : null
    );
  }

  create(data: CreateProposalResponseData): Promise<ProposalResponse> {
    const key = responseKey(data.proposalId, data.userId);

    if (this.responses.has(key)) {
      return Promise.reject(new ProposalResponseAlreadyExistsError('Already answered'));
    }

    const response = new ProposalResponse({
      id: `66666666-6666-4666-8666-${String(this.nextId++).padStart(12, '0')}`,
      ...data,
    });
    this.responses.set(key, response);
    return Promise.resolve(response);
  }

  updateAnswer(
    proposalId: string,
    userId: string,
    answer: UserProposalAnswer
  ): Promise<ProposalResponse | null> {
    const key = responseKey(proposalId, userId);
    const current = this.responses.get(key);

    if (!current) {
      return Promise.resolve(null);
    }

    const updated = new ProposalResponse({ ...current, answer });
    this.responses.set(key, updated);
    return Promise.resolve(updated);
  }

  setEvent(eventId: string, proposalId: string | null, memberIds: string[]): void {
    this.events.set(eventId, { proposalId, memberIds: new Set(memberIds) });
  }

  clear(): void {
    this.events.clear();
    this.responses.clear();
    this.nextId = 1;
  }
}

function responseKey(proposalId: string, userId: string): string {
  return `${proposalId}:${userId}`;
}
