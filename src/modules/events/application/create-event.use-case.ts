import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { safeExtension } from '../../../shared/utils';
import { type CreatedEvent, EventRepository } from '../domain/event.repository';

export interface CreateEventInput {
  groupId: string;
  userId: string;
  name?: string;
  date?: string;
  time?: string;
  location?: string;
  image?: {
    originalName: string;
    contentType: string;
    bytes: Uint8Array;
  };
  budgetStart?: string | null;
  budgetEnd?: string | null;
}

export class InvalidEventCreationError extends Error {}
export class EventGroupNotFoundError extends Error {}
export class EventGroupAccessDeniedError extends Error {}

@Injectable()
export class CreateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: CreateEventInput): Promise<CreatedEvent> {
    const name = input.name?.trim();
    const location = input.location?.trim();

    if (!name || !input.date || !input.time || !location) {
      throw new InvalidEventCreationError('Nome, dia, horário e endereço são obrigatórios');
    }

    if (input.image && !input.image.contentType.startsWith('image/')) {
      throw new InvalidEventCreationError('Somente imagens são aceitas');
    }

    const extension = input.image ? safeExtension(input.image.originalName) : '';
    if (input.image && !extension) {
      throw new InvalidEventCreationError('Extensão inválida para imagem');
    }

    const userIsMember = await this.events.findGroupMembership(input.groupId, input.userId);

    if (userIsMember === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }

    if (!userIsMember) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const eventId = randomUUID();
    let imageKey: string | null = null;

    if (input.image) {
      imageKey = `events/${eventId}/images/${randomUUID()}${extension}`;

      await this.storage.save({
        key: imageKey,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
    }

    try {
      return await this.events.create({
        id: eventId,
        groupId: input.groupId,
        ownerId: input.userId,
        name,
        timeslot: new Date(`${input.date}T${input.time}:00.000Z`),
        location: {
          description: location,
          // TODO: marcar como manual somente quando o endereço for digitado livremente, depois
          // da integração com um provedor de localização (externalId).
          manuallyCreated: true,
        },
        image: imageKey,
        budgetStart: input.budgetStart ?? null,
        budgetEnd: input.budgetEnd ?? null,
        status: 'pending',
        ownerAnswer: 'yes',
        createdAt: new Date(),
      });
    } catch (error) {
      if (imageKey) {
        await this.storage.delete(imageKey).catch(() => undefined);
      }
      throw error;
    }
  }
}
