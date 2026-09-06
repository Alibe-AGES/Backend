import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GroupsController } from '../../../../src/modules/groups/http/groups.controller';
import { CreateGroupUseCase, InvalidGroupError } from '../../../../src/modules/groups/application/create-group.use-case';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import type { Group } from '../../../../src/modules/groups/domain/group.entity';
import { randomUUID } from 'crypto';

describe('GroupsController', () => {
    let controller: GroupsController;
    let useCase: { 
        execute: jest.Mock 
    };

    const authenticatedRequest = {
        user: { id: '11111111-1111-4111-8111-111111111111' },
    } as AuthenticatedRequest;

    beforeEach(async () => {
        useCase = { execute: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GroupsController],
            providers: [{ provide: CreateGroupUseCase, useValue: useCase }],
        }).compile();

        controller = module.get(GroupsController);
    });

    it('Chama o useCase com profilePic null', async () => {
        const id = randomUUID()
        const group = {
            id: id,
            name: 'Group of friends',
            profilePic: null,
            createdAt: new Date('2026-08-30T00:00:00.000Z'),
        } as Group;

        useCase.execute.mockResolvedValue(group);

        const result = await controller.create({
                name: 'Group of friends' 
            } as any,
            null,
            authenticatedRequest,
        );

        expect(useCase.execute).toHaveBeenCalledWith({ name: 'Group of friends', image: null });
        expect(result).toEqual({ 
            id: group.id,
            name: group.name,
            profilePic: group.profilePic,
            createdAt: group.createdAt
        });
    });

    it('Caso de sucesso para um input com nome e imagem válidos', async () => {
        const file = {
            originalname: 'photo.png',
            mimetype: 'image/png',
            buffer: Buffer.from([1, 2, 3]),
        } as Express.Multer.File;

        const id = randomUUID()
        const group = {
            id: id,
            name: 'Group with photo',
            profilePic: `groups/${id}/image.png`,
            createdAt: new Date('2026-08-30T00:00:00.000Z'),
        } as Group;

        useCase.execute.mockResolvedValue(group);

        const result = await controller.create({
                name: 'Group with photo' 
            } as any,
            file,
            authenticatedRequest,
        );

        expect(useCase.execute).toHaveBeenCalledWith({
        name: 'Group with photo',
        image: {
            originalName: 'photo.png',
            contentType: 'image/png',
            bytes: file.buffer,
        },
        });
        expect(result.profilePic).toBe(`/group/${group.id}/image`);
    });

    it('Retorna BadRequestException para nome em branco', async () => {
        useCase.execute.mockRejectedValue(new InvalidGroupError('Nome deve conter entre 1 e 500 caracteres'));

        await expect(controller.create({ name: '' } as any, null, authenticatedRequest))
            .rejects.toThrow(BadRequestException);
    });
});