import type { ProposalAnswer } from './proposal-response.entity';

/** Place from the catalog (Google Places), stored only when a proposal first uses it. */
export interface CatalogLocation {
  externalId: string;
  description: string | null;
  address: string | null;
}

export interface StoredCatalogLocation {
  id: string;
  description: string | null;
  address: string | null;
}

export interface CreateSuggestionData {
  id: string;
  groupId: string;
  ownerId: string;
  name: string;
  location: CatalogLocation;
  timeslot: Date | null;
  budgetStart: string | null;
  budgetEnd: string | null;
  createdAt: Date;
}

export interface CreatedSuggestion {
  id: string;
  type: 'suggestion';
  groupId: string;
  name: string;
  timeslot: Date | null;
  budgetStart: string | null;
  budgetEnd: string | null;
  createdAt: Date;
  owner: { id: string; name: string; image: string | null };
  location: StoredCatalogLocation;
  myAnswer: ProposalAnswer;
  /** True quando o autor é o único membro do grupo e o próprio aceite completa o match. */
  matched: boolean;
}

export class ProposalLocationNotFoundError extends Error {}

export abstract class ProposalRepository {
  /** Retorna null quando o grupo não existe. */
  abstract findGroupMembership(groupId: string, userId: string): Promise<boolean | null>;

  /** Location do catálogo já salva por uma proposta anterior, buscada pelo Place ID. */
  abstract findCatalogLocation(externalId: string): Promise<StoredCatalogLocation | null>;

  /**
   * Reutiliza ou cria a location do catálogo e cria a sugestão com o aceite do autor
   * atomicamente, sem criar evento.
   */
  abstract createSuggestion(data: CreateSuggestionData): Promise<CreatedSuggestion>;
}
