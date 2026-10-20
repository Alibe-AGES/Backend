import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../events/application/create-event.use-case';
import {
  type CreatedLocationProposal,
  EventLocationNotFoundError,
  EventRepository,
} from '../../events/domain/event.repository';

export interface CreateProposalInput {
  groupId: string;
  userId: string;
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
  constructor(private readonly events: EventRepository) {}

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
    if (!(await this.events.findLocationById(input.locationId))) {
      throw new EventLocationNotFoundError('Localização não encontrada');
    }

    return this.events.createWithExistingLocation({
      id: randomUUID(),
      groupId: input.groupId,
      ownerId: input.userId,
      locationId: input.locationId,
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
}
