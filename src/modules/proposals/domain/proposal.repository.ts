import type { ProposalAnswer } from './proposal-response.entity';

export interface LocationPriceRange {
  start: string | null;
  end: string | null;
  currencyCode: string | null;
}

export interface NewSuggestionLocation {
  id: string;
  externalId: string | null;
  name: string | null;
  description: string | null;
  address: string | null;
  openingHours: string[];
  rating: number | null;
  phoneNumber: string | null;
  website: string | null;
  priceRange: LocationPriceRange;
  image: string | null;
  manuallyCreated: boolean;
}

export interface StoredProposalLocation extends Omit<NewSuggestionLocation, 'manuallyCreated'> {
  id: string;
  manuallyCreated: boolean | null;
}

export type SuggestionLocation =
  { kind: 'existing'; id: string } | { kind: 'new'; value: NewSuggestionLocation };

export interface CreateSuggestionData {
  id: string;
  groupId: string;
  ownerId: string;
  name: string | null;
  location: SuggestionLocation;
  createdAt: Date;
}

export interface CreatedSuggestion {
  id: string;
  type: 'suggestion';
  groupId: string;
  name: string | null;
  createdAt: Date;
  owner: { id: string; name: string; image: string | null };
  location: StoredProposalLocation;
  myAnswer: ProposalAnswer;
  /** True quando o autor é o único membro do grupo e o próprio aceite completa o match. */
  matched: boolean;
}

export interface ProposalDetails {
  id: string;
  type: 'suggestion' | 'event';
  groupId: string;
  eventId: string | null;
  name: string | null;
  createdAt: Date;
  matchedAt: Date | null;
  owner: { id: string; name: string; image: string | null };
  location: StoredProposalLocation | null;
  myAnswer: ProposalAnswer | null;
}

export interface ProposalDetailsAccess {
  proposal: ProposalDetails;
  userIsMember: boolean;
}

export interface ProposalAnswerCount {
  yes: number;
  no: number;
  pending: number;
}

export interface ActiveSuggestion {
  id: string;
  type: 'suggestion';
  groupId: string;
  name: string | null;
  createdAt: Date;
  owner: { id: string; name: string; image: string | null };
  location: StoredProposalLocation | null;
  responses: ProposalAnswerCount;
}

export class ProposalLocationNotFoundError extends Error {}

export abstract class ProposalRepository {
  /** Retorna null quando o grupo não existe. */
  abstract findGroupMembership(groupId: string, userId: string): Promise<boolean | null>;

  /** Location do catálogo já salva por uma proposta anterior, buscada pelo Place ID. */
  abstract findCatalogLocation(externalId: string): Promise<StoredProposalLocation | null>;

  abstract findLocationById(id: string): Promise<StoredProposalLocation | null>;

  abstract findDetails(id: string, userId: string): Promise<ProposalDetailsAccess | null>;

  /**
   * Sugestões do grupo ainda sem match que o usuário ainda não respondeu, da mais recente para
   * a mais antiga. As sugestões do próprio usuário ficam de fora, pois o autor já nasce com `yes`.
   */
  abstract findActiveSuggestions(groupId: string, userId: string): Promise<ActiveSuggestion[]>;

  /**
   * Reutiliza ou cria a location do catálogo e cria a sugestão com o aceite do autor
   * atomicamente, sem criar evento.
   */
  abstract createSuggestion(data: CreateSuggestionData): Promise<CreatedSuggestion>;
}
