import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { AuthenticatedRequest } from 'src/modules/auth/http/authenticated-user';
import {
  CreateAvailabilityUseCase,
  InvalidAvailabilityError,
} from '../../../../src/modules/availability/application/create-availability.use-case';
import { AvailabilityController } from '../../../../src/modules/availability/http/availability.controller';
import { AvailabilityResponseDto } from '../../../../src/modules/availability/http/dto/availability-response.dto';
import { CreateAvailabilityDto } from '../../../../src/modules/availability/http/dto/create-availability.dto';
import { Availability } from 'src/modules/availability/domain/availability.entity';

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

  it('should successfully call the useCase', async () => {
    const id = randomUUID();

    const createAvailabilityDto = {
      userId: userId,
      date: '2026-10-14',
      startTime: '18:00',
      endTime: '22:00',
    } as CreateAvailabilityDto;

    const mockAvailabilityEntity = {
      id: id,
      groupId: groupId,
      userId: userId,
      date: new Date('2026-10-14T00:00:00Z'),
      timeslotStart: new Date('2026-10-14T18:00:00Z'),
      timeslotEnd: new Date('2026-10-14T22:00:00Z'),
    } as Availability;

    const availabilityResponseDTO = {
      id: id,
      groupId: groupId,
      userId: userId,
      date: '2026-10-14',
      startTime: '18:00',
      endTime: '22:00',
    } as AvailabilityResponseDto;

    createAvailabilityUseCaseMock.create.mockResolvedValue(mockAvailabilityEntity);

    const result = await controller.create(groupId, createAvailabilityDto, authenticatedRequest);

    expect(result).toEqual(availabilityResponseDTO);
  });

  it('should successfully call the useCase without startTime and endTime', async () => {
    const id = randomUUID();

    const createAvailabilityDto = {
      userId: userId,
      date: '2026-10-14',
    } as CreateAvailabilityDto;

    const mockAvailabilityEntity = {
      id: id,
      groupId: groupId,
      userId: userId,
      date: new Date('2026-10-14T00:00:00Z'),
      timeslotStart: null,
      timeslotEnd: null,
    } as Availability;

    const availabilityResponseDto = {
      id: id,
      groupId: groupId,
      userId: userId,
      date: '2026-10-14',
      startTime: null,
      endTime: null,
    } as AvailabilityResponseDto;

    createAvailabilityUseCaseMock.create.mockResolvedValue(mockAvailabilityEntity);

    const result = await controller.create(groupId, createAvailabilityDto, authenticatedRequest);

    expect(result).toEqual(availabilityResponseDto);
  });

  it('should throw BadRequestException for startTime not null and endTime null', async () => {
    createAvailabilityUseCaseMock.create.mockRejectedValue(
      new InvalidAvailabilityError('Data inválida para registrar disponibilidade')
    );

    const createAvailabilityDto = {
      userId: userId,
      date: '2026-05-14',
      startTime: '18:00',
    } as CreateAvailabilityDto;

    await expect(
      controller.create(groupId, createAvailabilityDto, authenticatedRequest)
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException for a date older than Date.now()', async () => {
    createAvailabilityUseCaseMock.create.mockRejectedValue(
      new InvalidAvailabilityError('startTime e endTime devem estar ambos preenchidos ou nenhum')
    );

    const createAvailabilityDto = {
      userId: userId,
      date: '2026-05-14',
    } as CreateAvailabilityDto;

    await expect(
      controller.create(groupId, createAvailabilityDto, authenticatedRequest)
    ).rejects.toThrow(BadRequestException);
  });
});
