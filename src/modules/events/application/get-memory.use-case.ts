import { Injectable } from '@nestjs/common';
import {
  EventMemoryDetails,
  EventRepository,
} from '../domain/event.repository';
import { EventDetailsAccessDeniedError } from './get-event.use-case';

export class MemoryNotFoundError extends Error {}

@Injectable()
export class GetMemoryUseCase {
  constructor(private readonly events: EventRepository) {}

  async execute(eventId: string, memoryId: string, userId: string): Promise<EventMemoryDetails> {
    const access = await this.events.findMemoryById(memoryId, eventId, userId);

    if (!access) {
      throw new MemoryNotFoundError('Memória não encontrada');
    }

    if (!access.userIsMember) {
      throw new EventDetailsAccessDeniedError('O usuário não pertence ao grupo do evento');
    }

    return access.memory;
  }
}
