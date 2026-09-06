import { Test, TestingModule } from '@nestjs/testing';
import { GroupsModule } from '../../../../src/modules/groups/groups.module';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { GroupInvitesController } from '../../../../src/modules/groups/http/group-invites.controller';
import { GroupsController } from '../../../../src/modules/groups/http/groups.controller';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';

const authenticatedRequest = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as AuthenticatedRequest;

describe('GroupsModule integration', () => {
  let module: TestingModule;
  const create = jest.fn()
  const prisma = {
    group: { create },
  } as unknown as PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [GroupsModule],
    })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('registers the mock controllers without application providers', () => {
    expect(module.get(GroupsController)).toBeInstanceOf(GroupsController);
    expect(module.get(GroupInvitesController)).toBeInstanceOf(GroupInvitesController);
  });

  describe('GroupsController', () => {
    it('creates a group without image', async () => {
      const controller = module.get(GroupsController);

      const result = await controller.create(
        { name: 'Group of friends' } as any,
        null,
        authenticatedRequest,
      );

      expect(result.name).toBe('Group of friends');
      expect(result.profilePic).toBeNull();
    });

    it('creates a group with an uploaded image', async () => {
      const controller = module.get(GroupsController);
      const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from([1, 2, 3]),
      } as Express.Multer.File;

      const result = await controller.create(
        { name: 'Group with photo' } as any,
        file,
        authenticatedRequest,
      );

      expect(result.profilePic).toBe(`/group/${result.id}/image`);
    });

    it('rejects an invalid name with 400', async () => {
      const controller = module.get(GroupsController);

      await expect(
        controller.create({ name: '' } as any, null, authenticatedRequest),
      ).rejects.toThrow();
    });
  });

  describe('GroupInvitesController', () => {
    it('reuses a valid invite and creates a new token after expiration', () => {
      const controller = module.get(GroupInvitesController);
      const groupId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const initialTime = new Date('2026-08-30T12:00:00.000Z').getTime();
      const now = jest.spyOn(Date, 'now').mockReturnValue(initialTime);
  
      const first = controller.getInviteLink(groupId, authenticatedRequest);
      const current = controller.getInviteLink(groupId, authenticatedRequest);
  
      expect(current.token).toBe(first.token);
      expect(first.expiresAt).toEqual(new Date('2026-09-06T12:00:00.000Z'));
  
      now.mockReturnValue(new Date('2026-09-07T12:00:00.000Z').getTime());
      const renewed = controller.getInviteLink(groupId, authenticatedRequest);
  
      expect(renewed.token).not.toBe(first.token);
      now.mockRestore();
    });
  });
});
