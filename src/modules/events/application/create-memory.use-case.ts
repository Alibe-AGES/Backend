import { Injectable, Logger } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { EventRepository } from '../domain/event.repository';
import { CreateMemoryDto } from '../http/dto/create-memory.dto';
import { safeExtension } from 'src/shared/utils';
import { InvalidEventCreationError, EventGroupNotFoundError, EventGroupAccessDeniedError } from './create-event.use-case';
import { GetEventUseCase } from './get-event.use-case';
import { randomUUID } from 'crypto';

export interface CreateMemoryInput {
  eventId: string;
  image?: {
    originalName: string;
    contentType: string;
    bytes: Uint8Array;
  };
}

export class InvalidMemoryCreationError extends Error {}

@Injectable()
export class CreateMemoryUseCase {
  private readonly logger = new Logger(CreateMemoryUseCase.name);

  constructor(
    private readonly getEventUseCase: GetEventUseCase,
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: CreateMemoryInput, userId: string): Promise<CreateMemoryDto> {
    const event = await this.getEventUseCase.execute(input.eventId, userId);

    if (input.image && !input.image.contentType.startsWith('image/')) {
      throw new InvalidEventCreationError('Somente imagens são aceitas');
    }

    const extension = input.image ? safeExtension(input.image.originalName) : '';
    if (input.image && !extension) {
      throw new InvalidEventCreationError('Extensão inválida para imagem');
    }

    const userIsMember = await this.events.findGroupMembership((await event).groupId, userId);

    if (userIsMember === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }

    if (!userIsMember) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const memoryId = randomUUID();
    const imageKey = `api/events/${input.eventId}/memories/${memoryId}/image`;
    
    await this.storage.save({
      key: imageKey,
      bytes: input.image.bytes,
      contentType: input.image.contentType,
    });

    try {
      const created = await this.events.createMemory({
        id: memoryId,
        eventId: input.eventId,
        pictureUrl: imageKey
      });

      return created;
    } catch (error) {
      await this.storage.delete(imageKey).catch(() => undefined);
      throw error;
    }
  }
}
