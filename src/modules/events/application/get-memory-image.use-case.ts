import { Injectable } from '@nestjs/common';
import { EventRepository } from '../domain/event.repository';
import { EventNotFoundError } from './get-event.use-case';
import { ObjectStorage, StoredObject } from 'src/shared/storage/object-storage';
import { EventImageAccessDeniedError } from './get-event-image.use-case';

export class MemoryImageNotFoundError extends Error {}

@Injectable()
export class GetMemoryImageUseCase {
  constructor(
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(eventId: string, memoryId: string, userId: string): Promise<StoredObject> {
    const access = await this.events.findMemoryImageAccess(eventId, memoryId, userId);

    if (!access) {
      throw new EventNotFoundError('Evento não encontrado');
    }

    if (!access.userIsMember) {
      throw new EventImageAccessDeniedError('O usuário não pertence ao grupo do evento');
    }

    if (!access.imageKey) {
      throw new MemoryImageNotFoundError('Imagem do evento não encontrada');
    }

    const image = await this.storage.findByKey(access.imageKey);

    if (!image) {
      throw new MemoryImageNotFoundError('Imagem do evento não encontrada');
    }

    return image;
  }
}
