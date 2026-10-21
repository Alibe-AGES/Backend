import { randomUUID } from 'node:crypto';
import {
  type CreatedSuggestion,
  type CreateSuggestionData,
  ProposalRepository,
  type StoredCatalogLocation,
} from '../../src/modules/proposals/domain/proposal.repository';

export class InMemoryProposalRepository extends ProposalRepository {
  private readonly groups = new Map<string, Set<string>>();
  /** Catalog locations stored by proposals, keyed by Google Place ID. */
  private readonly catalogLocations = new Map<string, StoredCatalogLocation>();
  readonly suggestions = new Map<string, CreatedSuggestion>();

  setGroupMembers(groupId: string, userIds: string[]): void {
    this.groups.set(groupId, new Set(userIds));
  }

  setCatalogLocation(externalId: string, location: StoredCatalogLocation): void {
    this.catalogLocations.set(externalId, location);
  }

  findGroupMembership(groupId: string, userId: string): Promise<boolean | null> {
    const members = this.groups.get(groupId);
    return Promise.resolve(members ? members.has(userId) : null);
  }

  findCatalogLocation(externalId: string): Promise<StoredCatalogLocation | null> {
    return Promise.resolve(this.catalogLocations.get(externalId) ?? null);
  }

  createSuggestion({
    location: catalogLocation,
    ...data
  }: CreateSuggestionData): Promise<CreatedSuggestion> {
    const location = this.catalogLocations.get(catalogLocation.externalId) ?? {
      id: randomUUID(),
      description: catalogLocation.description,
      address: catalogLocation.address,
    };
    this.catalogLocations.set(catalogLocation.externalId, location);
    const members = this.groups.get(data.groupId) ?? new Set<string>();

    const suggestion: CreatedSuggestion = {
      id: data.id,
      type: 'suggestion',
      groupId: data.groupId,
      name: data.name,
      createdAt: data.createdAt,
      owner: { id: data.ownerId, name: 'Ana Beatriz Silva', image: 'users/ana.jpg' },
      location,
      myAnswer: 'yes',
      matched: members.size === 1 && members.has(data.ownerId),
    };
    this.suggestions.set(suggestion.id, suggestion);
    return Promise.resolve(suggestion);
  }
}
