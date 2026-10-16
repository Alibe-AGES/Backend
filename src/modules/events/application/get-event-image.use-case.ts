import { Injectable } from '@nestjs/common';
import { ObjectStorage, type StoredObject } from '../../../shared/storage/object-storage';
import { EventRepository } from '../domain/event.repository';

export class EventForImageNotFoundError extends Error {}

export class EventImageAccessDeniedError extends Error {}

export class EventImageNotFoundError extends Error {}

@Injectable()
export class GetEventImageUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(eventId: string, userId: string): Promise<StoredObject> {
    const access = await this.events.findImageAccess(eventId, userId);

    if (!access) {
      throw new EventForImageNotFoundError('Evento não encontrado');
    }

    if (!access.userIsMember) {
      throw new EventImageAccessDeniedError('O usuário não pertence ao grupo do evento');
    }

    if (!access.imageKey) {
      throw new EventImageNotFoundError('Imagem do evento não encontrada');
    }

    const image = await this.storage.findByKey(access.imageKey);

    if (!image) {
      throw new EventImageNotFoundError('Imagem do evento não encontrada');
    }

    return image;
  }
}
