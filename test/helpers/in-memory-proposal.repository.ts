import {
  type ActiveSuggestion,
  type CreatedSuggestion,
  type CreateSuggestionData,
  type ProposalDetailsAccess,
  ProposalRepository,
  type StoredProposalLocation,
} from '../../src/modules/proposals/domain/proposal.repository';

export class InMemoryProposalRepository extends ProposalRepository {
  private readonly groups = new Map<string, Set<string>>();
  /** Catalog locations stored by proposals, keyed by Google Place ID. */
  private readonly catalogLocations = new Map<string, StoredProposalLocation>();
  private readonly locations = new Map<string, StoredProposalLocation>();
  readonly suggestions = new Map<string, CreatedSuggestion>();
  /** Active suggestions per group, already filtered and ordered as the Prisma adapter returns them. */
  private readonly activeSuggestions = new Map<string, ActiveSuggestion[]>();

  setGroupMembers(groupId: string, userIds: string[]): void {
    this.groups.set(groupId, new Set(userIds));
  }

  setCatalogLocation(externalId: string, location: StoredProposalLocation): void {
    this.catalogLocations.set(externalId, location);
    this.locations.set(location.id, location);
  }

  setActiveSuggestions(groupId: string, suggestions: ActiveSuggestion[]): void {
    this.activeSuggestions.set(groupId, suggestions);
  }

  findGroupMembership(groupId: string, userId: string): Promise<boolean | null> {
    const members = this.groups.get(groupId);
    return Promise.resolve(members ? members.has(userId) : null);
  }

  findCatalogLocation(externalId: string): Promise<StoredProposalLocation | null> {
    return Promise.resolve(this.catalogLocations.get(externalId) ?? null);
  }

  findLocationById(id: string): Promise<StoredProposalLocation | null> {
    return Promise.resolve(this.locations.get(id) ?? null);
  }

  findDetails(id: string, userId: string): Promise<ProposalDetailsAccess | null> {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return Promise.resolve(null);
    return Promise.resolve({
      proposal: {
        id: suggestion.id,
        type: suggestion.type,
        groupId: suggestion.groupId,
        eventId: null,
        name: suggestion.name,
        suggestionDate: suggestion.suggestionDate,
        createdAt: suggestion.createdAt,
        matchedAt: suggestion.matched ? suggestion.createdAt : null,
        owner: suggestion.owner,
        location: suggestion.location,
        myAnswer: suggestion.owner.id === userId ? suggestion.myAnswer : null,
      },
      userIsMember: this.groups.get(suggestion.groupId)?.has(userId) ?? false,
    });
  }

  findActiveSuggestions(groupId: string): Promise<ActiveSuggestion[]> {
    return Promise.resolve(this.activeSuggestions.get(groupId) ?? []);
  }

  createSuggestion({
    location: requestedLocation,
    ...data
  }: CreateSuggestionData): Promise<CreatedSuggestion> {
    const location =
      requestedLocation.kind === 'existing'
        ? this.locations.get(requestedLocation.id)
        : requestedLocation.value;
    if (!location) {
      throw new Error('Location not found');
    }
    this.locations.set(location.id, location);
    if (location.externalId) {
      this.catalogLocations.set(location.externalId, location);
    }
    const members = this.groups.get(data.groupId) ?? new Set<string>();

    const suggestion: CreatedSuggestion = {
      id: data.id,
      type: 'suggestion',
      groupId: data.groupId,
      name: data.name,
      suggestionDate: data.suggestionDate,
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
