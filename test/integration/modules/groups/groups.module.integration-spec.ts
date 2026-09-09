import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { GroupsModule } from '../../../../src/modules/groups/groups.module';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { ListGroupsUseCase } from '../../../../src/modules/groups/application/list-groups.use-case';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';
import { GroupInvitesController } from '../../../../src/modules/groups/http/group-invites.controller';
import { GroupsController } from '../../../../src/modules/groups/http/groups.controller';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryObjectStorage } from '../../../../test/helpers/in-memory-object.storage';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';

const authenticatedRequest = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as AuthenticatedRequest;

describe('GroupsModule integration', () => {
  let module: TestingModule;
  const findMany = jest.fn();
  const create = jest.fn();
  const inviteFindFirst = jest.fn();
  const inviteCreate = jest.fn();
  const prisma = {
    group: { findMany, create },
    inviteLink: { findFirst: inviteFindFirst, create: inviteCreate },
  } as unknown as PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [GroupsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    findMany.mockReset();
    create.mockReset();
    inviteFindFirst.mockReset();
    inviteCreate.mockReset();
  });

  it('connects the use case, repository and Prisma adapter', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const row = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Turma da Faculdade',
      profilePic: null,
      createdAt: new Date('2026-07-12'),
    };
    findMany.mockResolvedValue([row]);

    const listGroups = module.get(ListGroupsUseCase);
    const repository = module.get(GroupRepository);

    await expect(listGroups.execute(userId)).resolves.toEqual([row]);
    expect(repository).toBeDefined();
    expect(findMany).toHaveBeenCalledWith({
      where: {
        users: {
          some: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('registers the groups controllers', () => {
    expect(module.get(GroupsController)).toBeInstanceOf(GroupsController);
    expect(module.get(GroupInvitesController)).toBeInstanceOf(GroupInvitesController);
  });

  describe('GroupsController', () => {
    it('creates a group without image', async () => {
      const controller = module.get(GroupsController);
      const createdGroup = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Group of friends',
        profilePic: null,
        createdAt: new Date('2026-08-01'),
      };

      create.mockResolvedValue(createdGroup);

      const result = await controller.create(
        { name: 'Group of friends' } as any,
        null,
        authenticatedRequest
      );

      expect(result.name).toEqual('Group of friends');
      expect(result.profilePic).toBeNull();
    });

    it('creates a group with an uploaded image', async () => {
      const controller = module.get(GroupsController);
      const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from([1, 2, 3]),
      } as Express.Multer.File;

      const createdGroup = {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Group with photo',
        profilePic: file,
        createdAt: new Date('2026-08-01'),
      };

      create.mockResolvedValue(createdGroup);

      const result = await controller.create(
        { name: 'Group with photo' } as any,
        file,
        authenticatedRequest
      );

      expect(result.name).toEqual('Group with photo');
      expect(result.profilePic).toEqual(`/group/${result.id}/image`);
    });

    it('rejects an invalid name with 400', async () => {
      const controller = module.get(GroupsController);

      await expect(
        controller.create({ name: '' } as any, null, authenticatedRequest)
      ).rejects.toThrow();
    });
  });

  describe('GroupInvitesController', () => {
    it('reuses a valid invite and creates a new token after expiration', async () => {
      const controller = module.get(GroupInvitesController);
      const groupId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

      const validInvite = {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        token: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        validity: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        groupId,
      };

      inviteFindFirst.mockResolvedValueOnce(validInvite);

      const current = await controller.getInviteLink(groupId, authenticatedRequest);

      expect(current.token).toBe(validInvite.token);
      expect(current.expiresAt).toEqual(validInvite.validity);
      expect(inviteCreate).not.toHaveBeenCalled();

      const expiredInvite = { ...validInvite, validity: new Date(Date.now() - 1000) };
      const renewedInvite = {
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        token: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        validity: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        groupId,
      };

      inviteFindFirst.mockResolvedValueOnce(expiredInvite);
      inviteCreate.mockResolvedValueOnce(renewedInvite);

      const renewed = await controller.getInviteLink(groupId, authenticatedRequest);

      expect(renewed.token).toBe(renewedInvite.token);
      expect(renewed.token).not.toBe(validInvite.token);
      expect(inviteCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ groupId }),
      });
    });
  });
});
