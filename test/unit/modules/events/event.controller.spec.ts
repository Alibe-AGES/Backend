import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
  InvalidEventCreationError,
} from '../../../../src/modules/events/application/create-event.use-case';
import {
  EventAccessDeniedError,
  EventNotFoundError,
} from '../../../../src/modules/events/application/update-event.use-case';
import { Event } from '../../../../src/modules/events/domain/event.entity';
import { EventController } from '../../../../src/modules/events/http/event.controller';
import { CreateEventDto } from '../../../../src/modules/events/http/dto/create-event.dto';
import { UpdateEventDto } from '../../../../src/modules/events/http/dto/update-event.dto';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

describe('EventController', () => {
  const useCase = { execute: jest.fn() };
  const createUseCase = { execute: jest.fn() };
  const controller = new EventController(useCase as never, createUseCase as never);
  const eventId = '22222222-2222-4222-8222-222222222222';
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    useCase.execute.mockReset();
    createUseCase.execute.mockReset();
  });

  describe('create', () => {
    const groupId = '33333333-3333-4333-8333-333333333333';
    const request = { user: { id: userId } } as AuthenticatedRequest;
    const body = { name: 'Jantar' } as CreateEventDto;

    it('maps the created event, its proposal and the owner response', async () => {
      createUseCase.execute.mockResolvedValue({
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

      const result = await controller.create(groupId, body, undefined, request);

      expect(createUseCase.execute).toHaveBeenCalledWith({
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
      createUseCase.execute.mockRejectedValue(new Error('stop'));

      await expect(controller.create(groupId, body, image, request)).rejects.toThrow('stop');

      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          image: { originalName: 'event.png', contentType: 'image/png', bytes: image.buffer },
        })
      );
    });

    it('rejects a request without an authenticated user', async () => {
      await expect(
        controller.create(groupId, body, undefined, {} as AuthenticatedRequest)
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(createUseCase.execute).not.toHaveBeenCalled();
    });

    it.each([
      [new InvalidEventCreationError('invalid'), BadRequestException],
      [new EventGroupNotFoundError('not found'), NotFoundException],
      [new EventGroupAccessDeniedError('denied'), ForbiddenException],
    ])('maps %p to the matching HTTP exception', async (error, exception) => {
      createUseCase.execute.mockRejectedValue(error);

      await expect(controller.create(groupId, body, undefined, request)).rejects.toBeInstanceOf(
        exception
      );
    });
  });

  it('passes the authenticated user id to the use case', async () => {
    const result = { id: eventId, proposals: [{ id: 'proposal-id', ownerId: userId }] };
    useCase.execute.mockResolvedValue(result);

    await controller.update(eventId, { name: 'Changed' } as UpdateEventDto, undefined, {
      user: { id: userId },
    } as AuthenticatedRequest);

    expect(useCase.execute).toHaveBeenCalledWith(eventId, userId, { name: 'Changed' });
  });

  it('maps the uploaded image to binary use case input', async () => {
    const result = { id: eventId, proposals: [{ id: 'proposal-id', ownerId: userId }] };
    const image = {
      originalname: 'event.png',
      mimetype: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    } as Express.Multer.File;
    useCase.execute.mockResolvedValue(result);

    await controller.update(eventId, { name: 'Changed' } as UpdateEventDto, image, {
      user: { id: userId },
    } as AuthenticatedRequest);

    expect(useCase.execute).toHaveBeenCalledWith(eventId, userId, {
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
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('maps ownership errors to ForbiddenException', async () => {
    useCase.execute.mockRejectedValue(new EventAccessDeniedError('Access denied'));

    await expect(
      controller.update(eventId, { name: 'Changed' } as UpdateEventDto, undefined, {
        user: { id: userId },
      } as AuthenticatedRequest)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps missing events to NotFoundException', async () => {
    useCase.execute.mockRejectedValue(new EventNotFoundError('Event not found'));

    await expect(
      controller.update(eventId, { name: 'Changed' } as UpdateEventDto, undefined, {
        user: { id: userId },
      } as AuthenticatedRequest)
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
