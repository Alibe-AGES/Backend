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
    this.validateEventInput(input);

    const name = input.name!.trim();
    const location = input.location?.trim();

    await this.validateGroupMembership(input.groupId, input.userId);
    const savedLocation = await this.validateAndFetchLocation(input.locationId);

    const eventId = randomUUID();
    const newLocationId = randomUUID();
    const imageKey = await this.resolveAndSaveImage(input, savedLocation, newLocationId);

    const createdAt = new Date();
    const { notificationMessage, muralNotificationMessage } = this.buildNotificationMessages(
      name,
      input.date,
      input.time,
      input.userId
    );

    try {
      const created = await this.events.create({
        id: eventId,
        groupId: input.groupId,
        ownerId: input.userId,
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

      await this.sendGroupNotificationSafely(
        input.groupId,
        input.userId,
        notificationMessage,
        created.event.id
      );

      return created;
    } catch (error) {
      if (input.image && !savedLocation && imageKey) {
        await this.storage.delete(imageKey).catch(() => undefined);
      }
      throw error;
    }
  }

  // Métodos auxiliares privados para baixar a Complexidade Cognitiva:

  private validateEventInput(input: CreateEventInput): void {
    const name = input.name?.trim();
    const location = input.location?.trim();

    if (!name || !input.date || !input.time || (!input.locationId && !location)) {
      throw new InvalidEventCreationError(
        'Nome, dia, horário e locationId ou endereço são obrigatórios'
      );
    }
    if (input.locationId && location) {
      throw new InvalidEventCreationError('Informe locationId ou endereço, não ambos');
    }
    if (input.locationId && input.image) {
      throw new InvalidEventCreationError(
        'A imagem do evento é herdada da localização quando locationId é informado'
      );
    }
    if (input.image && !input.image.contentType.startsWith('image/')) {
      throw new InvalidEventCreationError('Somente imagens são aceitas');
    }

    const extension = input.image ? safeExtension(input.image.originalName) : '';
    if (input.image && !extension) {
      throw new InvalidEventCreationError('Extensão inválida para imagem');
    }
  }

  private async validateGroupMembership(groupId: string, userId: string): Promise<void> {
    const userIsMember = await this.events.findGroupMembership(groupId, userId);

    if (userIsMember === null) {
      throw new EventGroupNotFoundError('Grupo não encontrado');
    }
    if (!userIsMember) {
      throw new EventGroupAccessDeniedError('O usuário não pertence a este grupo');
    }
  }

  private async validateAndFetchLocation(locationId?: string) {
    if (!locationId) return null;

    const savedLocation = await this.events.findLocationById(locationId);
    if (!savedLocation) {
      throw new EventLocationNotFoundError('Localização não encontrada');
    }
    return savedLocation;
  }

  private async resolveAndSaveImage(
    input: CreateEventInput,
    savedLocation: { image?: string | null } | null,
    newLocationId: string
  ): Promise<string | null> {
    let imageKey: string | null = savedLocation?.image ?? null;

    if (input.image && !savedLocation) {
      const extension = safeExtension(input.image.originalName);
      imageKey = `locations/${newLocationId}/images/${randomUUID()}${extension}`;

      await this.storage.save({
        key: imageKey,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
    }

    return imageKey;
  }

  private buildNotificationMessages(name: string, date: string, time?: string, userId?: string) {
    const hasTime = time !== null && time !== undefined && time.trim() !== '';

    const scheduleText = hasTime
      ? `para o dia ${formatDate(date)} às ${time}`
      : `para o dia ${formatDate(date)}`;

    return {
      notificationMessage: `O evento "${name}" foi criado ${scheduleText}.`,
      muralNotificationMessage: `${groupNotificationUserReference(userId!)} criou o evento "${name}" ${scheduleText}.`,
    };
  }

  private async sendGroupNotificationSafely(
    groupId: string,
    userId: string,
    message: string,
    eventId: string
  ): Promise<void> {
    try {
      await this.groupNotifications.sendToGroup(
        groupId,
        {
          title: 'Novo encontro no grupo',
          body: message,
          data: {
            type: 'new_event',
            eventId,
            groupId,
          },
        },
        userId
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
