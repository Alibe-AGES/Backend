import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';

import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import {
  CreateEventUseCase,
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
  InvalidEventCreationError,
} from '../../../../src/modules/events/application/create-event.use-case';
import {
  EventNotFoundError as GetEventNotFoundError,
  GetEventUseCase,
} from '../../../../src/modules/events/application/get-event.use-case';
import {
  EventAccessDeniedError,
  EventNotFoundError as UpdateEventNotFoundError,
  UpdateEventUseCase,
} from '../../../../src/modules/events/application/update-event.use-case';
import { Event } from '../../../../src/modules/events/domain/event.entity';
import { CreateEventDto } from '../../../../src/modules/events/http/dto/create-event.dto';
import { UpdateEventDto } from '../../../../src/modules/events/http/dto/update-event.dto';
import { EventController } from '../../../../src/modules/events/http/event.controller';

describe('EventController', () => {
  let controller: EventController;
  let updateUseCaseMock: { execute: jest.Mock };
  let createUseCaseMock: { execute: jest.Mock };
  let getEventUseCaseMock: { execute: jest.Mock };

  const eventId = '22222222-2222-4222-8222-222222222222';
  const userId = '11111111-1111-4111-8111-111111111111';
  const authenticatedRequest = {
    user: { id: userId },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    updateUseCaseMock = { execute: jest.fn() };
    createUseCaseMock = { execute: jest.fn() };
    getEventUseCaseMock = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: UpdateEventUseCase, useValue: updateUseCaseMock },
        { provide: CreateEventUseCase, useValue: createUseCaseMock },
        { provide: GetEventUseCase, useValue: getEventUseCaseMock },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
  });

  describe('create', () => {
    const groupId = '33333333-3333-4333-8333-333333333333';
    const body = { name: 'Jantar' } as CreateEventDto;

    it('maps the created event, its proposal and the owner response', async () => {
      createUseCaseMock.execute.mockResolvedValue({
        event: new Event({
          id: eventId,
          name: 'Jantar',
          timeslot: new Date('2026-10-15T20:00:00.000Z'),
          image: null,
          budgetStart: null,
          budgetEnd: null,
          status: 'pending',
          groupId,
          location: { id: 'location-id', description: 'Casa', manuallyCreated: true },
          proposals: [{ id: 'proposal-id', ownerId: userId }],
          createdAt: new Date('2026-09-22T18:30:00.000Z'),
          updatedAt: new Date('2026-09-22T18:30:00.000Z'),
        }),
        ownerResponse: { id: 'response-id', userId, answer: 'yes' },
      });

      const result = await controller.create(groupId, body, undefined, authenticatedRequest);

      expect(createUseCaseMock.execute).toHaveBeenCalledWith({
        name: 'Jantar',
        groupId,
        userId,
        image: undefined,
      });
      expect(result).toMatchObject({
        date: '2026-10-15',
        time: '20:00',
        proposal: {
          id: 'proposal-id',
          ownerId: userId,
          response: { id: 'response-id', userId, answer: 'yes' },
        },
      });
      expect(result).not.toHaveProperty('updatedAt');
    });

    it('maps the uploaded image to binary use case input', async () => {
      const image = {
        originalname: 'event.png',
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      } as Express.Multer.File;
      createUseCaseMock.execute.mockRejectedValue(new Error('stop'));

      await expect(controller.create(groupId, body, image, authenticatedRequest)).rejects.toThrow('stop');

      expect(createUseCaseMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          image: { originalName: 'event.png', contentType: 'image/png', bytes: image.buffer },
        })
      );
    });

    it('rejects a request without an authenticated user', async () => {
      await expect(
        controller.create(groupId, body, undefined, {} as AuthenticatedRequest)
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(createUseCaseMock.execute).not.toHaveBeenCalled();
    });

    it.each([
      [new InvalidEventCreationError('invalid'), BadRequestException],
      [new EventGroupNotFoundError('not found'), NotFoundException],
      [new EventGroupAccessDeniedError('denied'), ForbiddenException],
    ])('maps %p to the matching HTTP exception', async (error, exception) => {
      createUseCaseMock.execute.mockRejectedValue(error);

      await expect(controller.create(groupId, body, undefined, authenticatedRequest)).rejects.toBeInstanceOf(
        exception
      );
    });
  });

  describe('update', () => {
    it('passes the authenticated user id to the use case', async () => {
      const result = { id: eventId, proposals: [{ id: 'proposal-id', ownerId: userId }] };
      updateUseCaseMock.execute.mockResolvedValue(result);

      await controller.update(eventId, { name: 'Changed' } as UpdateEventDto, undefined, authenticatedRequest);

      expect(updateUseCaseMock.execute).toHaveBeenCalledWith(eventId, userId, { name: 'Changed' });
    });

    it('maps the uploaded image to binary use case input', async () => {
      const result = { id: eventId, proposals: [{ id: 'proposal-id', ownerId: userId }] };
      const image = {
        originalname: 'event.png',
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      } as Express.Multer.File;
      updateUseCaseMock.execute.mockResolvedValue(result);

      await controller.update(eventId, { name: 'Changed' } as UpdateEventDto, image, authenticatedRequest);

      expect(updateUseCaseMock.execute).toHaveBeenCalledWith(eventId, userId, {
        name: 'Changed',
        image: {
          originalName: 'event.png',
          contentType: 'image/png',
          bytes: image.buffer,
        },
      });
    });

    it('rejects a request without an authenticated user', async () => {
      await expect(
        controller.update(
          eventId,
          { name: 'Changed' } as UpdateEventDto,
          undefined,
          {} as AuthenticatedRequest
        )
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(updateUseCaseMock.execute).not.toHaveBeenCalled();
    });

    it('maps ownership errors to ForbiddenException', async () => {
      updateUseCaseMock.execute.mockRejectedValue(new EventAccessDeniedError('Access denied'));

      await expect(
        controller.update(eventId, { name: 'Changed' } as UpdateEventDto, undefined, authenticatedRequest)
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps missing events to NotFoundException', async () => {
      updateUseCaseMock.execute.mockRejectedValue(new UpdateEventNotFoundError('Event not found'));

      await expect(
        controller.update(eventId, { name: 'Changed' } as UpdateEventDto, undefined, authenticatedRequest)
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('get', () => {
    it('Chama o useCase com o id de um Event não existente', async () => {
      getEventUseCaseMock.execute.mockRejectedValue(new GetEventNotFoundError('Evento não encontrado'));

      await expect(
        controller.get({ id: 'non-existent-id' } as any, authenticatedRequest)
      ).rejects.toThrow(GetEventNotFoundError);
    });

    it('Caso de sucesso para um input com id existente', async () => {
      const id = randomUUID();

      const event = {
        id: id,
        name: 'Jantar de aniversário',
        date: '2026-10-15',
        time: '20:00',
        image: 'https://example.com/events/jantar.jpg',
        budgetStart: '50.00',
        budgetEnd: '120.00',
        status: 'pending',
        groupId: '33333333-3333-4333-8333-333333333333',
        location: {
          id: '44444444-4444-4444-8444-444444444444',
          description: 'Rua dos Andradas, 1234, Porto Alegre',
          manuallyCreated: true,
        },
        proposal: {
          id: '55555555-5555-4555-8555-555555555555',
          owner: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            image: 'https://example.com/users/ana.jpg',
          },
          responses: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              answer: 'yes',
              createdAt: '2026-09-22T18:30:00.000Z',
              user: {
                id: '11111111-1111-4111-8111-111111111111',
                name: 'Ana Beatriz Silva',
                image: 'https://example.com/users/ana.jpg',
              },
            },
          ],
          createdAt: '2026-09-22T18:30:00.000Z',
        },
        createdAt: '2026-09-22T18:30:00.000Z',
        updatedAt: '2026-09-23T14:00:00.000Z',
      };

      getEventUseCaseMock.execute.mockResolvedValue(event);

      const result = await controller.get(id as any, authenticatedRequest);

      expect(getEventUseCaseMock.execute).toHaveBeenCalledWith(id, authenticatedRequest.user.id);
      expect(result).toBe(event);
    });
  });
});