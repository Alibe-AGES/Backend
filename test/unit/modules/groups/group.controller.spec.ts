import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GroupsController } from '../../../../src/modules/groups/http/groups.controller';
import {
  CreateGroupUseCase,
  InvalidGroupError,
} from '../../../../src/modules/groups/application/create-group.use-case';
import { ListGroupsUseCase } from '../../../../src/modules/groups/application/list-groups.use-case';
import { GetGroupProfilePictureUseCase } from '../../../../src/modules/groups/application/get-group-profile-picture.use-case';
import { GetGroupUseCase } from '../../../../src/modules/groups/application/get-group.use-case';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import type { Group } from '../../../../src/modules/groups/domain/group.entity';
import { randomUUID } from 'crypto';
import {
  GetAvailabilityIntervalsUseCase,
  GroupNotFoundError,
  InvalidAvailabilityDateError,
} from '../../../../src/modules/groups/application/get-availability-intervals.use-case';

describe('GroupsController', () => {
  let controller: GroupsController;
  let createGroupUseCaseMock: { execute: jest.Mock };
  let listGroupsUseCaseMock: { execute: jest.Mock };
  let getAvailabilityIntervalsUseCase: { execute: jest.Mock };
  let getGroupProfilePictureUseCaseMock: { execute: jest.Mock };
  let getGroupUseCaseMock: { execute: jest.Mock };

  const userId = '11111111-1111-4111-8111-111111111111';
  const authenticatedRequest = {
    user: { id: userId },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    createGroupUseCaseMock = { execute: jest.fn() };
    listGroupsUseCaseMock = { execute: jest.fn() };
    getAvailabilityIntervalsUseCase = { execute: jest.fn() };
    getGroupProfilePictureUseCaseMock = { execute: jest.fn() };
    getGroupUseCaseMock = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: CreateGroupUseCase,
          useValue: createGroupUseCaseMock,
        },
        {
          provide: ListGroupsUseCase,
          useValue: listGroupsUseCaseMock,
        },
        {
          provide: GetGroupProfilePictureUseCase,
          useValue: getGroupProfilePictureUseCaseMock,
        },
        {
          provide: GetGroupUseCase,
          useValue: getGroupUseCaseMock,
        },
        {
          provide: GetAvailabilityIntervalsUseCase,
          useValue: getAvailabilityIntervalsUseCase,
        },
      ],
    }).compile();
    controller = module.get(GroupsController);
  });
  describe('Endpoint para criar grupo', () => {
    it('Chama o useCase com profilePic null', async () => {
      const id = randomUUID();
      const group = {
        id: id,
        name: 'Group of friends',
        profilePic: null,
        createdAt: new Date('2026-08-30T00:00:00.000Z'),
      } as Group;

      createGroupUseCaseMock.execute.mockResolvedValue(group);

      const result = await controller.create(
        { name: 'Group of friends' } as any,
        null,
        authenticatedRequest
      );

      expect(createGroupUseCaseMock.execute).toHaveBeenCalledWith({
        name: 'Group of friends',
        image: null,
        creatorId: userId,
      });

      expect(result).toEqual({
        id: group.id,
        name: group.name,
        profilePic: group.profilePic,
        createdAt: group.createdAt,
      });
    });

    it('Caso de sucesso para um input com nome e imagem válidos', async () => {
      const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from([1, 2, 3]),
      } as Express.Multer.File;

      const id = randomUUID();
      const group = {
        id: id,
        name: 'Group with photo',
        profilePic: `groups/${id}/image.png`,
        createdAt: new Date('2026-08-30T00:00:00.000Z'),
      } as Group;

      createGroupUseCaseMock.execute.mockResolvedValue(group);

      const result = await controller.create(
        { name: 'Group with photo' } as any,
        file,
        authenticatedRequest
      );

      expect(createGroupUseCaseMock.execute).toHaveBeenCalledWith({
        name: 'Group with photo',
        image: {
          originalName: 'photo.png',
          contentType: 'image/png',
          bytes: file.buffer,
        },
        creatorId: userId,
      });
      expect(result.profilePic).toBe(`/groups/${group.id}/profile-picture`);
    });

    it('Retorna BadRequestException para nome em branco', async () => {
      createGroupUseCaseMock.execute.mockRejectedValue(
        new InvalidGroupError('Nome deve conter entre 1 e 500 caracteres')
      );

      await expect(
        controller.create({ name: '' } as any, null, authenticatedRequest)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Endpoint para get group', () => {
    it('delegates group details to the get group use case', async () => {
      const details = {
        id: randomUUID(),
        name: 'Group of friends',
        profilePic: null,
        createdAt: new Date('2026-08-30T00:00:00.000Z'),
        participants: [],
        nextEvent: null,
      };
      getGroupUseCaseMock.execute.mockResolvedValue(details);

      await expect(controller.getById(details.id)).resolves.toBe(details);
      expect(getGroupUseCaseMock.execute).toHaveBeenCalledWith(details.id);
    });
  });

  describe('Endpoint para get de intervalos de disponibilidade', () => {
    it('maps availability data and protected profile-picture URLs', async () => {
      const groupId = randomUUID();
      const dateParam = '2026-06-05';

      getAvailabilityIntervalsUseCase.execute.mockResolvedValue({
        date: dateParam,
        users: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            profilePic: 'users/ana/profile-picture.png',
            availableAllDay: false,
            intervals: [],
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Bruno Henrique Souza',
            profilePic: null,
            availableAllDay: true,
            intervals: [],
          },
        ],
      });

      await expect(
        controller.getAvailabilities(groupId, dateParam, authenticatedRequest)
      ).resolves.toEqual({
        date: dateParam,
        users: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            image: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
            availableAllDay: false,
            intervals: [],
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Bruno Henrique Souza',
            image: null,
            availableAllDay: true,
            intervals: [],
          },
        ],
      });
      expect(getAvailabilityIntervalsUseCase.execute).toHaveBeenCalledWith(
        groupId,
        dateParam,
        userId
      );
    });

    it('Lança GroupNotFoundError para um id inexistente', async () => {
      getAvailabilityIntervalsUseCase.execute.mockRejectedValue(
        new GroupNotFoundError('Grupo não encontrado')
      );

      await expect(
        controller.getAvailabilities(
          '11111111-1111-4111-8111-111111111111',
          '2026-06-05',
          authenticatedRequest
        )
      ).rejects.toThrow(NotFoundException);
    });

    it('Lança BadRequestException para um date em formato inválido', async () => {
      const invalidDateFormat = '2026/11/23';

      getAvailabilityIntervalsUseCase.execute.mockRejectedValue(
        new InvalidAvailabilityDateError('Formato inválido de data')
      );

      await expect(
        controller.getAvailabilities(
          '11111111-1111-4111-8111-111111111111',
          invalidDateFormat,
          authenticatedRequest
        )
      ).rejects.toThrow(BadRequestException);
    });
  });
});
