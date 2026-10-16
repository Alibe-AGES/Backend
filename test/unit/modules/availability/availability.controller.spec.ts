import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import {
  AvailabilityAccessDeniedError,
  AvailabilityGroupNotFoundError,
  CreateAvailabilityUseCase,
  InvalidAvailabilityError,
} from '../../../../src/modules/availability/application/create-availability.use-case';
import { AvailabilityController } from '../../../../src/modules/availability/http/availability.controller';
import { AvailabilityResponseDto } from '../../../../src/modules/availability/http/dto/availability-response.dto';
import { CreateAvailabilityDto } from '../../../../src/modules/availability/http/dto/create-availability.dto';
import { Availability } from '../../../../src/modules/availability/domain/availability.entity';

const userId = '11111111-1111-4111-8111-111111111111';
const groupId = '8549aded-7ca6-45bf-b96c-a8ddc49c95f0';

describe('AvailabilityController', () => {
  let controller: AvailabilityController;
  let createAvailabilityUseCaseMock: { create: jest.Mock };

  const authenticatedRequest = {
    user: { id: userId },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    createAvailabilityUseCaseMock = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        {
          provide: CreateAvailabilityUseCase,
          useValue: createAvailabilityUseCaseMock,
        },
      ],
    }).compile();
    controller = module.get(AvailabilityController);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should successfully call the useCase with a single interval', async () => {
    const id = randomUUID();

    const createAvailabilityDto = {
      date: '2026-10-14',
      intervals: [{ startTime: '18:00', endTime: '22:00' }],
    } as CreateAvailabilityDto;

    const mockAvailabilityEntities: Availability[] = [
      new Availability({
        id,
        groupId,
        userId,
        date: new Date('2026-10-14T00:00:00Z'),
        timeslotStart: new Date('2026-10-14T18:00:00Z'),
        timeslotEnd: new Date('2026-10-14T22:00:00Z'),
      }),
    ];

    const expectedResponse: AvailabilityResponseDto[] = [
      {
        id,
        groupId,
        userId,
        date: '2026-10-14',
        startTime: '18:00',
        endTime: '22:00',
      },
    ];

    createAvailabilityUseCaseMock.create.mockResolvedValue(mockAvailabilityEntities);

    const result = await controller.create(groupId, createAvailabilityDto, authenticatedRequest);

    expect(result).toEqual(expectedResponse);
    expect(createAvailabilityUseCaseMock.create).toHaveBeenCalledWith({
      groupId,
      userId,
      date: '2026-10-14',
      intervals: [{ timeslotStart: '18:00', timeslotEnd: '22:00' }],
    });
  });

  it('should successfully call the useCase with multiple intervals', async () => {
    const firstId = randomUUID();
    const secondId = randomUUID();

    const createAvailabilityDto = {
      date: '2026-10-14',
      intervals: [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '18:00', endTime: '22:00' },
      ],
    } as CreateAvailabilityDto;

    const mockAvailabilityEntities: Availability[] = [
      new Availability({
        id: firstId,
        groupId,
        userId,
        date: new Date('2026-10-14T00:00:00Z'),
        timeslotStart: new Date('2026-10-14T09:00:00Z'),
        timeslotEnd: new Date('2026-10-14T12:00:00Z'),
      }),
      new Availability({
        id: secondId,
        groupId,
        userId,
        date: new Date('2026-10-14T00:00:00Z'),
        timeslotStart: new Date('2026-10-14T18:00:00Z'),
        timeslotEnd: new Date('2026-10-14T22:00:00Z'),
      }),
    ];

    const expectedResponse: AvailabilityResponseDto[] = [
      {
        id: firstId,
        groupId,
        userId,
        date: '2026-10-14',
        startTime: '09:00',
        endTime: '12:00',
      },
      {
        id: secondId,
        groupId,
        userId,
        date: '2026-10-14',
        startTime: '18:00',
        endTime: '22:00',
      },
    ];

    createAvailabilityUseCaseMock.create.mockResolvedValue(mockAvailabilityEntities);

    const result = await controller.create(groupId, createAvailabilityDto, authenticatedRequest);

    expect(result).toEqual(expectedResponse);
  });

  it('should successfully call the useCase without intervals', async () => {
    const id = randomUUID();

    const createAvailabilityDto = {
      date: '2026-10-14',
      intervals: [],
    } as CreateAvailabilityDto;

    const mockAvailabilityEntities: Availability[] = [
      new Availability({
        id,
        groupId,
        userId,
        date: new Date('2026-10-14T00:00:00Z'),
        timeslotStart: null,
        timeslotEnd: null,
      }),
    ];

    const expectedResponse: AvailabilityResponseDto[] = [
      {
        id,
        groupId,
        userId,
        date: '2026-10-14',
        startTime: null,
        endTime: null,
      },
    ];

    createAvailabilityUseCaseMock.create.mockResolvedValue(mockAvailabilityEntities);

    const result = await controller.create(groupId, createAvailabilityDto, authenticatedRequest);

    expect(result).toEqual(expectedResponse);
  });

  it('should throw BadRequestException when the useCase reports invalid data', async () => {
    createAvailabilityUseCaseMock.create.mockRejectedValue(
      new InvalidAvailabilityError('endTime deve ser posterior a startTime')
    );

    const createAvailabilityDto = {
      date: '2026-05-14',
      intervals: [{ startTime: '22:00', endTime: '18:00' }],
    } as CreateAvailabilityDto;

    await expect(
      controller.create(groupId, createAvailabilityDto, authenticatedRequest)
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a request without an authenticated user', async () => {
    const requestWithoutUser = {} as AuthenticatedRequest;
    const createAvailabilityDto = { date: '2026-05-14', intervals: [] } as CreateAvailabilityDto;

    await expect(
      controller.create(groupId, createAvailabilityDto, requestWithoutUser)
    ).rejects.toThrow(UnauthorizedException);
    expect(createAvailabilityUseCaseMock.create).not.toHaveBeenCalled();
  });

  it('maps access denied to ForbiddenException', async () => {
    createAvailabilityUseCaseMock.create.mockRejectedValue(
      new AvailabilityAccessDeniedError('User does not belong to this group')
    );

    const createAvailabilityDto = { date: '2026-05-14', intervals: [] } as CreateAvailabilityDto;

    await expect(
      controller.create(groupId, createAvailabilityDto, authenticatedRequest)
    ).rejects.toThrow(ForbiddenException);
  });

  it('maps a missing group to NotFoundException', async () => {
    createAvailabilityUseCaseMock.create.mockRejectedValue(
      new AvailabilityGroupNotFoundError('Group not found')
    );

    const createAvailabilityDto = { date: '2026-05-14', intervals: [] } as CreateAvailabilityDto;

    await expect(
      controller.create(groupId, createAvailabilityDto, authenticatedRequest)
    ).rejects.toThrow(NotFoundException);
  });
});
