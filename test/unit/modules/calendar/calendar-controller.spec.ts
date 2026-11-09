import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CalendarController } from '../../../../src/modules/calendar/http/calendar.controller';
import {
  CalendarAccessDeniedError,
  CalendarGroupNotFoundError,
  GetGroupCalendarUseCase,
  InvalidCalendarPeriodError,
} from '../../../../src/modules/calendar/application/get-group-calendar.use-case';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

describe('CalendarController', () => {
  let controller: CalendarController;
  let getGroupCalendarUseCase: jest.Mocked<GetGroupCalendarUseCase>;

  const mockGroupId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '987e6543-e21b-12d3-a456-426614174999';

  const mockRequest = {
    user: { id: mockUserId },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockGetGroupCalendarUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        {
          provide: GetGroupCalendarUseCase,
          useValue: mockGetGroupCalendarUseCase,
        },
      ],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
    getGroupCalendarUseCase = module.get(GetGroupCalendarUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    const queryDto = { month: 5, year: 2026 };

    it('should successfully return the calendar days for a group', async () => {
      const expectedResult = [
        {
          date: '2026-05-10',
          hasEvents: true,
          hasProposals: false,
          hasAvailabilities: true,
          scheduledEventIds: [],
          proposalIds: [],
          proposalEventIds: [],
          availableUserIds: [],
        },
      ];

      getGroupCalendarUseCase.execute.mockResolvedValueOnce(expectedResult as any);

      const result = await controller.list(mockGroupId, queryDto, mockRequest);

      expect(getGroupCalendarUseCase.execute).toHaveBeenCalledWith({
        groupId: mockGroupId,
        userId: mockUserId,
        month: queryDto.month,
        year: queryDto.year,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException if user is not authenticated in request', async () => {
      const unauthenticatedRequest = { user: undefined } as unknown as AuthenticatedRequest;

      await expect(controller.list(mockGroupId, queryDto, unauthenticatedRequest)).rejects.toThrow(
        UnauthorizedException
      );

      expect(getGroupCalendarUseCase.execute).not.toHaveBeenCalled();
    });

    it('should translate InvalidCalendarPeriodError to BadRequestException', async () => {
      getGroupCalendarUseCase.execute.mockRejectedValueOnce(
        new InvalidCalendarPeriodError('Invalid period specified')
      );

      await expect(controller.list(mockGroupId, queryDto, mockRequest)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should translate CalendarAccessDeniedError to ForbiddenException', async () => {
      getGroupCalendarUseCase.execute.mockRejectedValueOnce(
        new CalendarAccessDeniedError('User does not belong to group')
      );

      await expect(controller.list(mockGroupId, queryDto, mockRequest)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should translate CalendarGroupNotFoundError to NotFoundException', async () => {
      getGroupCalendarUseCase.execute.mockRejectedValueOnce(
        new CalendarGroupNotFoundError('Group not found')
      );

      await expect(controller.list(mockGroupId, queryDto, mockRequest)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should rethrow unexpected errors', async () => {
      const unexpectedError = new Error('Database connection failed');
      getGroupCalendarUseCase.execute.mockRejectedValueOnce(unexpectedError);

      await expect(controller.list(mockGroupId, queryDto, mockRequest)).rejects.toThrow(
        unexpectedError
      );
    });
  });
});
