import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  EventAccessDeniedError,
  EventNotFoundError,
} from '../../../../src/modules/events/application/update-event.use-case';
import { EventController } from '../../../../src/modules/events/http/event.controller';
import { UpdateEventDto } from '../../../../src/modules/events/http/dto/update-event.dto';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

describe('EventController', () => {
  const useCase = { execute: jest.fn() };
  const controller = new EventController(useCase as never);
  const eventId = '22222222-2222-4222-8222-222222222222';
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => useCase.execute.mockReset());

  it('passes the authenticated user id to the use case', async () => {
    const result = { id: eventId, proposals: [{ id: 'proposal-id', ownerId: userId }] };
    useCase.execute.mockResolvedValue(result);

    await controller.update(
      eventId,
      { name: 'Changed' } as UpdateEventDto,
      {
        user: { id: userId },
      } as AuthenticatedRequest
    );

    expect(useCase.execute).toHaveBeenCalledWith(eventId, userId, { name: 'Changed' });
  });

  it('rejects a request without an authenticated user', async () => {
    await expect(
      controller.update(eventId, { name: 'Changed' } as UpdateEventDto, {} as AuthenticatedRequest)
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(useCase.execute).not.toHaveBeenCalled();
  });

  it('maps ownership errors to ForbiddenException', async () => {
    useCase.execute.mockRejectedValue(new EventAccessDeniedError('Access denied'));

    await expect(
      controller.update(
        eventId,
        { name: 'Changed' } as UpdateEventDto,
        {
          user: { id: userId },
        } as AuthenticatedRequest
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps missing events to NotFoundException', async () => {
    useCase.execute.mockRejectedValue(new EventNotFoundError('Event not found'));

    await expect(
      controller.update(
        eventId,
        { name: 'Changed' } as UpdateEventDto,
        {
          user: { id: userId },
        } as AuthenticatedRequest
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
