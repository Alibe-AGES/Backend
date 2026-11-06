import { Injectable, Logger } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { EventRepository } from '../domain/event.repository';
import { CreateMemoryDto } from '../http/dto/create-memory.dto';
import { safeExtension } from '../../../../src/shared/utils';
import { EventGroupNotFoundError } from './create-event.use-case';
import { EventDetailsAccessDeniedError, GetEventUseCase } from './get-event.use-case';
import { randomUUID } from 'node:crypto';

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
      throw new InvalidMemoryCreationError('Somente imagens são aceitas');
    }

    const extension = input.image ? safeExtension(input.image.originalName) : '';
    if (input.image && !extension) {
      throw new InvalidMemoryCreationError('Extensão inválida para imagem');
    }

    const userIsMember = await this.events.findGroupMembership(event.groupId, userId);

    if (userIsMember === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }

    if (!userIsMember) {
      throw new EventDetailsAccessDeniedError('O usuário não pertence a este grupo');
    }

    const memoryId = randomUUID();
    const imageKey = `/memories/${memoryId}/images/${randomUUID()}${extension}`;

    await this.storage.save({
      key: imageKey,
      bytes: input.image.bytes,
      contentType: input.image.contentType,
    });

    try {
      const created = await this.events.createMemory({
        id: memoryId,
        eventId: input.eventId,
        picture: imageKey,
      });

      return created;
    } catch (error) {
      await this.storage.delete(imageKey).catch(() => undefined);
      throw error;
    }
  }
}
