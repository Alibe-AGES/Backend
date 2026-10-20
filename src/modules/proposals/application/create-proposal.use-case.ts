import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../events/application/create-event.use-case';
import {
  type CatalogEventLocation,
  type CreatedLocationProposal,
  EventLocationNotFoundError,
  EventRepository,
} from '../../events/domain/event.repository';
import { PlacesProvider } from '../../../shared/places/places-provider';

export interface CreateProposalInput {
  groupId: string;
  userId: string;
  /** Google Place ID returned by the locations feed and search. */
  locationId: string;
  name: string;
  date: string;
  time: string;
  budgetStart?: string;
  budgetEnd?: string;
}

export class InvalidProposalCreationError extends Error {}

@Injectable()
export class CreateProposalUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly places: PlacesProvider
  ) {}

  async execute(input: CreateProposalInput): Promise<CreatedLocationProposal> {
    const name = input.name?.trim();
    if (!name || !input.date || !input.time || !input.locationId) {
      throw new InvalidProposalCreationError('Nome, dia, horário e localização são obrigatórios');
    }

    const membership = await this.events.findGroupMembership(input.groupId, input.userId);
    if (membership === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }
    if (!membership) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const location = await this.resolveLocation(input.locationId);

    return this.events.createWithCatalogLocation({
      id: randomUUID(),
      groupId: input.groupId,
      ownerId: input.userId,
      location,
      name,
      timeslot: new Date(`${input.date}T${input.time}:00.000Z`),
      image: null,
      budgetStart: input.budgetStart ?? null,
      budgetEnd: input.budgetEnd ?? null,
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: new Date(),
    });
  }

  /** The catalog is not persisted while browsing, so Google is only queried for new places. */
  private async resolveLocation(externalId: string): Promise<CatalogEventLocation> {
    const saved = await this.events.findCatalogLocation(externalId);
    if (saved) {
      return { externalId, description: saved.description, address: saved.address };
    }

    const place = await this.places.getPlaceById(externalId);
    if (!place) {
      throw new EventLocationNotFoundError('Localização não encontrada');
    }

    return { externalId, description: place.summary ?? place.name, address: place.address };
  }
}
