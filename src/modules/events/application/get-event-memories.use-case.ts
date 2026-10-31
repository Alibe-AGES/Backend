import { Injectable } from '@nestjs/common';
import { EventRepository } from '../domain/event.repository';
import { EventMemoriesResponseDto } from '../http/dto/event-memories.dto';
import { EventNotFoundError } from './get-event.use-case';

export class EventMemoriesAccessDeniedError extends Error {}

@Injectable()
export class GetEventMemoriesUseCase {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(eventId: string, userId: string): Promise<EventMemoriesResponseDto[]> {
    const memories = await this.eventRepository.findMemories(eventId, userId);

    if (!memories) {
      throw new EventNotFoundError('Evento não encontrado.');
    }
    if (!memories.userIsMember) {
      throw new EventMemoriesAccessDeniedError('O usuário não pertence ao grupo do evento.');
    }
    return memories.memories;
  }
}
