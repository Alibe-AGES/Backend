import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { safeExtension } from '../../../shared/utils';
import { Event } from '../domain/event.entity';
import { EventRepository } from '../domain/event.repository';

export interface UpdateEventInput {
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

export class EventNotFoundError extends Error {}
export class EventAccessDeniedError extends Error {}
export class InvalidEventUpdateError extends Error {}

@Injectable()
export class UpdateEventUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(eventId: string, userId: string, input: UpdateEventInput): Promise<Event> {
    if (!Object.values(input).some((value) => value !== undefined)) {
      throw new InvalidEventUpdateError('At least one event field must be provided');
    }

    const currentEvent = await this.events.findById(eventId);

    if (!currentEvent) {
      throw new EventNotFoundError('Event not found');
    }

    if (!currentEvent.proposals.some((proposal) => proposal.ownerId === userId)) {
      throw new EventAccessDeniedError('User is not the owner of an event proposal');
    }

    const update: {
      name?: string;
      timeslot?: Date;
      location?: string;
      image?: string;
      budgetStart?: string | null;
      budgetEnd?: string | null;
    } = {};

    if (input.name !== undefined) update.name = input.name;
    if (input.budgetStart !== undefined) update.budgetStart = input.budgetStart;
    if (input.budgetEnd !== undefined) update.budgetEnd = input.budgetEnd;
    if (input.location !== undefined) update.location = input.location;

    if (input.date !== undefined || input.time !== undefined) {
      const date = input.date ?? currentEvent.timeslot?.toISOString().slice(0, 10);
      const time = input.time ?? currentEvent.timeslot?.toISOString().slice(11, 16) ?? '00:00';

      if (!date) {
        throw new InvalidEventUpdateError(
          'date is required when the event has no current timeslot'
        );
      }

      update.timeslot = new Date(`${date}T${time}:00.000Z`);
    }

    let newImageKey: string | null = null;

    if (input.image) {
      if (!input.image.contentType.startsWith('image/')) {
        throw new InvalidEventUpdateError('Somente imagens são aceitas');
      }

      const extension = safeExtension(input.image.originalName);
      if (!extension) {
        throw new InvalidEventUpdateError('Extensão inválida para imagem');
      }

      newImageKey = `events/${eventId}/images/${randomUUID()}${extension}`;

      await this.storage.save({
        key: newImageKey,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
      update.image = newImageKey;
    }

    let updatedEvent: Event;
    try {
      updatedEvent = await this.events.update(eventId, update);
    } catch (error) {
      if (newImageKey) {
        await this.storage.delete(newImageKey).catch(() => undefined);
      }
      throw error;
    }

    if (
      newImageKey &&
      currentEvent.image?.startsWith('events/') &&
      currentEvent.image !== newImageKey
    ) {
      await this.storage.delete(currentEvent.image).catch(() => undefined);
    }

    return updatedEvent;
  }
}
