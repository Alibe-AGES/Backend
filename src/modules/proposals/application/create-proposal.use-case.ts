import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../events/application/create-event.use-case';
import {
  type CatalogLocation,
  type CreatedSuggestion,
  ProposalLocationNotFoundError,
  ProposalRepository,
} from '../domain/proposal.repository';
import { PlacesProvider } from '../../../shared/places/places-provider';

export interface CreateProposalInput {
  groupId: string;
  userId: string;
  /** Google Place ID returned by the locations feed and search. */
  locationId: string;
  name: string;
}

export class InvalidProposalCreationError extends Error {}

/** Cria uma sugestão de encontro; o evento só é criado depois, pelos endpoints de evento. */
@Injectable()
export class CreateProposalUseCase {
  constructor(
    private readonly proposals: ProposalRepository,
    private readonly places: PlacesProvider
  ) {}

  async execute(input: CreateProposalInput): Promise<CreatedSuggestion> {
    const name = input.name?.trim();
    if (!name || !input.locationId) {
      throw new InvalidProposalCreationError('Nome e localização são obrigatórios');
    }

    const membership = await this.proposals.findGroupMembership(input.groupId, input.userId);
    if (membership === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }
    if (!membership) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const location = await this.resolveLocation(input.locationId);

    return this.proposals.createSuggestion({
      id: randomUUID(),
      groupId: input.groupId,
      ownerId: input.userId,
      location,
      name,
      createdAt: new Date(),
    });
  }

  /** The catalog is not persisted while browsing, so Google is only queried for new places. */
  private async resolveLocation(externalId: string): Promise<CatalogLocation> {
    const saved = await this.proposals.findCatalogLocation(externalId);
    if (saved) {
      return { externalId, description: saved.description, address: saved.address };
    }

    const place = await this.places.getPlaceById(externalId);
    if (!place) {
      throw new ProposalLocationNotFoundError('Localização não encontrada');
    }

    return { externalId, description: place.summary ?? place.name, address: place.address };
  }
}
