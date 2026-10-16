import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import {
  CreateEventUseCase,
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
  InvalidEventCreationError,
} from '../../../../src/modules/events/application/create-event.use-case';
import { GetEventImageUseCase } from '../../../../src/modules/events/application/get-event-image.use-case';
import {
  EventDetailsAccessDeniedError,
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
        { provide: GetEventImageUseCase, useValue: { execute: jest.fn() } },
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

      await expect(controller.create(groupId, body, image, authenticatedRequest)).rejects.toThrow(
        'stop'
      );

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

      await expect(
        controller.create(groupId, body, undefined, authenticatedRequest)
      ).rejects.toBeInstanceOf(exception);
    });
  });

  describe('update', () => {
    it('passes the authenticated user id to the use case', async () => {
      const result = { id: eventId, proposals: [{ id: 'proposal-id', ownerId: userId }] };
      updateUseCaseMock.execute.mockResolvedValue(result);

      await controller.update(
        eventId,
        { name: 'Changed' } as UpdateEventDto,
        undefined,
        authenticatedRequest
      );

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

      await controller.update(
        eventId,
        { name: 'Changed' } as UpdateEventDto,
        image,
        authenticatedRequest
      );

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
        controller.update(
          eventId,
          { name: 'Changed' } as UpdateEventDto,
          undefined,
          authenticatedRequest
        )
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('maps missing events to NotFoundException', async () => {
      updateUseCaseMock.execute.mockRejectedValue(new UpdateEventNotFoundError('Event not found'));

      await expect(
        controller.update(
          eventId,
          { name: 'Changed' } as UpdateEventDto,
          undefined,
          authenticatedRequest
        )
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('get', () => {
    const eventDetails = {
      id: eventId,
      name: 'Jantar de aniversário',
      image: 'events/22222222-2222-4222-8222-222222222222/image.png',
      timeslot: new Date('2026-10-15T20:00:00.000Z'),
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
          id: userId,
          name: 'Ana Beatriz Silva',
          image: 'users/11111111-1111-4111-8111-111111111111/profile-picture.jpg',
        },
        responses: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            answer: 'yes',
            createdAt: new Date('2026-09-22T18:30:00.000Z'),
            user: {
              id: userId,
              name: 'Ana Beatriz Silva',
              image: 'users/11111111-1111-4111-8111-111111111111/profile-picture.jpg',
            },
          },
        ],
        createdAt: new Date('2026-09-22T18:30:00.000Z'),
      },
      createdAt: new Date('2026-09-22T18:30:00.000Z'),
      updatedAt: new Date('2026-09-23T14:00:00.000Z'),
    };

    it('maps the complete event contract and protected image URLs', async () => {
      getEventUseCaseMock.execute.mockResolvedValue(eventDetails);

      const result = await controller.get(eventId, authenticatedRequest);

      expect(getEventUseCaseMock.execute).toHaveBeenCalledWith(eventId, userId);
      expect(result).toEqual({
        id: eventId,
        name: 'Jantar de aniversário',
        date: '2026-10-15',
        time: '20:00',
        image: '/api/events/22222222-2222-4222-8222-222222222222/image',
        budgetStart: '50.00',
        budgetEnd: '120.00',
        status: 'pending',
        groupId: '33333333-3333-4333-8333-333333333333',
        location: eventDetails.location,
        proposal: {
          ...eventDetails.proposal,
          owner: {
            ...eventDetails.proposal.owner,
            image: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
          },
          responses: [
            {
              ...eventDetails.proposal.responses[0],
              user: {
                ...eventDetails.proposal.responses[0].user,
                image: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
              },
            },
          ],
        },
        createdAt: eventDetails.createdAt,
        updatedAt: eventDetails.updatedAt,
      });
    });

    it.each([
      [new GetEventNotFoundError('Evento não encontrado'), NotFoundException],
      [
        new EventDetailsAccessDeniedError('O usuário não pertence ao grupo do evento'),
        ForbiddenException,
      ],
    ])('maps %p to the matching HTTP exception', async (error, exception) => {
      getEventUseCaseMock.execute.mockRejectedValue(error);

      await expect(controller.get(eventId, authenticatedRequest)).rejects.toBeInstanceOf(exception);
    });

    it('rejects a request without an authenticated user', async () => {
      await expect(controller.get(eventId, {} as AuthenticatedRequest)).rejects.toBeInstanceOf(
        UnauthorizedException
      );
      expect(getEventUseCaseMock.execute).not.toHaveBeenCalled();
    });
  });
});
