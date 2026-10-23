import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { safeExtension } from '../../../shared/utils';
import { groupNotificationUserReference } from '../../groups/domain/group-notification-message';
import { type CreatedEvent, EventRepository } from '../domain/event.repository';
import { GroupPushNotificationService } from './group-push-notification.service';

export interface CreateEventInput {
  groupId: string;
  userId: string;
  name?: string;
  date?: string;
  time?: string;
  location?: string;
  locationId?: string | null;
  matchedSuggestionId?: string;
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
export class EventLocationNotFoundError extends Error {}

@Injectable()
export class CreateEventUseCase {
  private readonly logger = new Logger(CreateEventUseCase.name);

  constructor(
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage,
    private readonly groupNotifications: GroupPushNotificationService
  ) {}

  async execute(input: CreateEventInput): Promise<CreatedEvent> {
    const { name, location, extension } = this.validateInput(input);

    const userIsMember = await this.events.findGroupMembership(input.groupId, input.userId);

    if (userIsMember === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }

    if (!userIsMember) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }

    const eventId = randomUUID();
    const newLocationId = randomUUID();
    const savedLocation = input.locationId
      ? await this.events.findLocationById(input.locationId)
      : null;
    if (input.locationId && !savedLocation) {
      throw new EventLocationNotFoundError('Localização não encontrada');
    }

    let imageKey: string | null = savedLocation?.image ?? null;
    const createdAt = new Date();

    const hasTime = input.time !== null && input.time !== undefined && input.time.trim() !== '';

    const scheduleText = hasTime
      ? `para o dia ${formatDate(input.date)} às ${input.time}`
      : `para o dia ${formatDate(input.date)}`;

    const notificationMessage = `O evento "${name}" foi criado ${scheduleText}.`;

    // O push continua usando notificationMessage. Somente o mural persiste a referência do autor,
    // que será resolvida pelo GET e também poderá ser repetida para vários usuários no match.
    const muralNotificationMessage = `${groupNotificationUserReference(input.userId)} criou o evento "${name}" ${scheduleText}.`;

    if (input.image && !savedLocation) {
      imageKey = `locations/${newLocationId}/images/${randomUUID()}${extension}`;

      await this.storage.save({
        key: imageKey,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
    }

    try {
      const created = await this.events.create({
        id: eventId,
        groupId: input.groupId,
        ownerId: input.userId,
        matchedSuggestionId: input.matchedSuggestionId,
        name,
        timeslot: new Date(`${input.date}T${input.time}:00.000Z`),
        location: savedLocation
          ? { kind: 'existing', id: savedLocation.id }
          : { kind: 'new', id: newLocationId, address: location as string, image: imageKey },
        image: imageKey,
        budgetStart: input.budgetStart ?? savedLocation?.priceStart ?? null,
        budgetEnd: input.budgetEnd ?? savedLocation?.priceEnd ?? null,
        status: 'pending',
        ownerAnswer: 'yes',
        createdAt,
        notification: {
          type: 'createdEvent',
          message: muralNotificationMessage,
          createdAt,
        },
      });

      await this.notifyGroup(input, created.event.id, notificationMessage);

      return created;
    } catch (error) {
      if (input.image && !savedLocation && imageKey) {
        await this.storage.delete(imageKey).catch(() => undefined);
      }
      throw error;
    }
  }

  private validateInput(input: CreateEventInput): {
    name: string;
    location: string | undefined;
    extension: string;
  } {
    const name = input.name?.trim();
    const location = input.location?.trim();
    const locationChoices = [input.locationId, location].filter(Boolean).length;

    if (!name || !input.date || !input.time || locationChoices === 0) {
      throw new InvalidEventCreationError(
        'Nome, dia, horário e locationId ou endereço são obrigatórios'
      );
    }
    if (locationChoices > 1) {
      throw new InvalidEventCreationError('Informe locationId ou endereço, não ambos');
    }
    if (input.locationId && input.image) {
      throw new InvalidEventCreationError(
        'A imagem do evento é herdada da localização quando locationId é informado'
      );
    }
    if (input.matchedSuggestionId && !input.locationId) {
      throw new InvalidEventCreationError(
        'matchedSuggestionId exige a localização salva da sugestão'
      );
    }
    if (input.image && !input.image.contentType.startsWith('image/')) {
      throw new InvalidEventCreationError('Somente imagens são aceitas');
    }

    const extension = input.image ? safeExtension(input.image.originalName) : '';
    if (input.image && !extension) {
      throw new InvalidEventCreationError('Extensão inválida para imagem');
    }
    return { name, location, extension };
  }

  private async notifyGroup(
    input: CreateEventInput,
    eventId: string,
    notificationMessage: string
  ): Promise<void> {
    try {
      await this.groupNotifications.sendToGroup(
        input.groupId,
        {
          title: 'Novo encontro no grupo',
          body: notificationMessage,
          data: { type: 'new_event', eventId, groupId: input.groupId },
        },
        input.userId
      );
    } catch (error) {
      this.logger.error(
        `Evento ${eventId} criado, mas os destinatários da notificação não puderam ser consultados`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
