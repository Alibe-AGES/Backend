import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { safeExtension } from '../../../shared/utils';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../events/application/create-event.use-case';
import {
  type CreatedSuggestion,
  type NewSuggestionLocation,
  ProposalLocationNotFoundError,
  ProposalRepository,
  type SuggestionLocation,
} from '../domain/proposal.repository';
import { PlacesProvider } from '../../../shared/places/places-provider';

export interface CreateProposalInput {
  groupId: string;
  userId: string;
  locationId?: string;
  externalId?: string;
  name?: string;
  date: string;
  description?: string;
  address?: string;
  phoneNumber?: string;
  website?: string;
  openingHours?: string[];
  priceStart?: number;
  priceEnd?: number;
  image?: {
    originalName: string;
    contentType: string;
    bytes: Uint8Array;
  };
}

export class InvalidProposalCreationError extends Error {}

/** Cria uma sugestão de encontro; o evento só é criado depois, pelos endpoints de evento. */
@Injectable()
export class CreateProposalUseCase {
  constructor(
    private readonly proposals: ProposalRepository,
    private readonly places: PlacesProvider,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: CreateProposalInput): Promise<CreatedSuggestion> {
    const extension = this.validateInput(input);

    const membership = await this.proposals.findGroupMembership(input.groupId, input.userId);
    if (membership === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }
    if (!membership) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const locationId = randomUUID();
    const imageKey = input.image
      ? `locations/${locationId}/images/${randomUUID()}${extension}`
      : null;
    const resolved = await this.resolveLocation(input, locationId, imageKey);
    const createdAt = new Date();

    if (input.image && resolved.location.kind === 'new') {
      await this.storage.save({
        key: imageKey as string,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
    }

    try {
      return await this.proposals.createSuggestion({
        id: randomUUID(),
        groupId: input.groupId,
        ownerId: input.userId,
        location: resolved.location,
        name: resolved.proposalName,
        suggestionDate: new Date(`${input.date}T00:00:00.000Z`),
        createdAt,
      });
    } catch (error) {
      await this.removeImageIfCreationFailed(input.image, resolved.location, imageKey);
      throw error;
    }
  }

  private validateInput(input: CreateProposalInput): string {
    if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      throw new InvalidProposalCreationError('A data da sugestão é obrigatória');
    }
    if (input.locationId && input.externalId) {
      throw new InvalidProposalCreationError('Informe locationId ou externalId, não ambos');
    }
    if (input.image && !input.image.contentType.startsWith('image/')) {
      throw new InvalidProposalCreationError('Somente imagens são aceitas');
    }

    const extension = input.image ? safeExtension(input.image.originalName) : '';
    if (input.image && !extension) {
      throw new InvalidProposalCreationError('Extensão inválida para imagem');
    }
    return extension;
  }

  private async removeImageIfCreationFailed(
    image: CreateProposalInput['image'],
    location: SuggestionLocation,
    imageKey: string | null
  ): Promise<void> {
    if (image && location.kind === 'new' && imageKey) {
      await this.storage.delete(imageKey).catch(() => undefined);
    }
  }

  private async resolveLocation(
    input: CreateProposalInput,
    newLocationId: string,
    imageKey: string | null
  ): Promise<{ location: SuggestionLocation; proposalName: string | null }> {
    if (input.locationId) {
      const saved = await this.proposals.findLocationById(input.locationId);
      if (!saved) {
        throw new ProposalLocationNotFoundError('Localização não encontrada');
      }
      return {
        location: { kind: 'existing', id: saved.id },
        proposalName: saved.name,
      };
    }

    if (input.externalId) {
      const saved = await this.proposals.findCatalogLocation(input.externalId);
      if (saved) {
        return {
          location: { kind: 'existing', id: saved.id },
          proposalName: saved.name,
        };
      }

      const place = await this.places.getPlaceById(input.externalId, { includePriceRange: true });
      if (!place) {
        throw new ProposalLocationNotFoundError('Localização não encontrada');
      }

      return {
        proposalName: place.name || null,
        location: {
          kind: 'new',
          value: {
            id: newLocationId,
            externalId: input.externalId,
            name: place.name || null,
            description: place.summary,
            address: place.address,
            openingHours: place.openingHours?.weekdayDescriptions ?? [],
            rating: place.rating,
            phoneNumber: place.phoneNumber,
            website: place.websiteUri,
            priceRange: {
              start: this.money(place.priceRange?.start?.amount),
              end: this.money(place.priceRange?.end?.amount),
              currencyCode:
                place.priceRange?.start?.currencyCode ??
                place.priceRange?.end?.currencyCode ??
                null,
            },
            image: imageKey,
            manuallyCreated: false,
          },
        },
      };
    }

    const manual: NewSuggestionLocation = {
      id: newLocationId,
      externalId: null,
      name: input.name?.trim() || null,
      description: input.description?.trim() || null,
      address: input.address?.trim() || null,
      openingHours: input.openingHours ?? [],
      rating: null,
      phoneNumber: input.phoneNumber?.trim() || null,
      website: input.website?.trim() || null,
      priceRange: {
        start: input.priceStart?.toFixed(2) ?? null,
        end: input.priceEnd?.toFixed(2) ?? null,
        currencyCode: input.priceStart !== undefined || input.priceEnd !== undefined ? 'BRL' : null,
      },
      image: imageKey,
      manuallyCreated: true,
    };
    return {
      location: { kind: 'new', value: manual },
      proposalName: manual.name,
    };
  }

  private money(value: number | undefined): string | null {
    return value === undefined ? null : value.toFixed(2);
  }
}
