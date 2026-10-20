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
  private readonly logger = new Logger(CreateEventUseCase.name);

  constructor(
    private readonly events: EventRepository,
    private readonly storage: ObjectStorage,
    private readonly groupNotifications: GroupPushNotificationService
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
    const createdAt = new Date();

    const hasTime = input.time !== null && input.time !== undefined && input.time.trim() !== '';

    const scheduleText = hasTime
      ? `para o dia ${formatDate(input.date)} às ${input.time}`
      : `para o dia ${formatDate(input.date)}`;

    const notificationMessage = `O evento "${name}" foi criado ${scheduleText}.`;

    // O push continua usando notificationMessage. Somente o mural persiste a referência do autor,
    // que será resolvida pelo GET e também poderá ser repetida para vários usuários no match.
    const muralNotificationMessage = `${groupNotificationUserReference(input.userId)} criou o evento \"${name}\" ${scheduleText}.`;

    if (input.image) {
      imageKey = `events/${eventId}/images/${randomUUID()}${extension}`;

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
        createdAt,
        notification: {
          type: 'createdEvent',
          message: muralNotificationMessage,
          createdAt,
        },
      });

      try {
        await this.groupNotifications.sendToGroup(
          input.groupId,
          {
            title: 'Novo encontro no grupo',
            body: notificationMessage,
            data: {
              type: 'new_event',
              eventId: created.event.id,
              groupId: input.groupId,
            },
          },
          input.userId
        );
      } catch (error) {
        this.logger.error(
          `Evento ${created.event.id} criado, mas os destinatários da notificação não puderam ser consultados`,
          error instanceof Error ? error.stack : undefined
        );
      }

      return created;
    } catch (error) {
      if (imageKey) {
        await this.storage.delete(imageKey).catch(() => undefined);
      }
      throw error;
    }
  }
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}
