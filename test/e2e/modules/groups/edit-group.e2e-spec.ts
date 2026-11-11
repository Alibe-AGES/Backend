import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { Group } from '../../../../src/modules/groups/domain/group.entity';
import {
  GroupManagementError,
  GroupRepository,
} from '../../../../src/modules/groups/domain/group.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const PATH = `/groups/${GROUP_ID}`;

describe('Group editing HTTP contract', () => {
  let app: INestApplication;
  let group: Group;
  const findManagementState = jest.fn();
  const updateOwned = jest.fn();
  const removeMember = jest.fn();
  const previousAuth = process.env.MOCK_AUTH_ENABLED;
  const previousUser = process.env.MOCK_AUTH_USER_ID;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .overrideProvider(GroupRepository)
      .useValue({ findManagementState, updateOwned, removeMember })
      .compile();
    app = module.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = OWNER_ID;
    group = new Group({
      id: GROUP_ID,
      name: 'Original',
      profilePic: 'groups/old.png',
      createdAt: new Date(),
    });
    findManagementState
      .mockReset()
      .mockResolvedValue({ ownerId: OWNER_ID, profilePic: group.profilePic });
    updateOwned.mockReset().mockImplementation(async (_groupId, _ownerId, data) => ({
      group: new Group({ ...group, ...data }),
      previousImageKey: group.profilePic,
    }));
    removeMember.mockReset().mockResolvedValue(true);
  });

  afterAll(async () => {
    if (previousAuth === undefined) delete process.env.MOCK_AUTH_ENABLED;
    else process.env.MOCK_AUTH_ENABLED = previousAuth;
    if (previousUser === undefined) delete process.env.MOCK_AUTH_USER_ID;
    else process.env.MOCK_AUTH_USER_ID = previousUser;
    await app.close();
  });

  it('updates a trimmed name while preserving the current photo', async () => {
    const response = await request(app.getHttpServer())
      .patch(PATH)
      .field('name', '  Novo nome  ')
      .expect(200);
    expect(response.body.name).toBe('Novo nome');
    expect(response.body.profilePic).toBe(`${PATH}/profile-picture`);
    expect(updateOwned).toHaveBeenCalledWith(GROUP_ID, OWNER_ID, { name: 'Novo nome' });
  });

  it('replaces the photo and accepts explicit removal without another upload', async () => {
    await request(app.getHttpServer())
      .patch(PATH)
      .attach('profile_pic', Buffer.from([137, 80, 78, 71]), {
        filename: 'photo.png',
        contentType: 'image/png',
      })
      .expect(200);
    expect(updateOwned).toHaveBeenCalledWith(GROUP_ID, OWNER_ID, {
      profilePic: expect.stringMatching(/^groups\/.+\.png$/),
    });
    const response = await request(app.getHttpServer())
      .patch(PATH)
      .field('removeProfilePicture', 'true')
      .expect(200);
    expect(response.body.profilePic).toBeNull();
  });

  it('rejects empty edits, invalid fields, simultaneous upload/removal and oversized files', async () => {
    await request(app.getHttpServer()).patch(PATH).send({}).expect(400);
    await request(app.getHttpServer()).patch(PATH).field('name', 'a').expect(400);
    await request(app.getHttpServer()).patch(PATH).field('ownerId', MEMBER_ID).expect(400);
    await request(app.getHttpServer())
      .patch(PATH)
      .field('removeProfilePicture', 'invalid')
      .expect(400);
    await request(app.getHttpServer())
      .patch(PATH)
      .field('removeProfilePicture', 'true')
      .attach('profile_pic', Buffer.from([1]), { filename: 'image.png', contentType: 'image/png' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(PATH)
      .attach('profile_pic', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'image.png',
        contentType: 'image/png',
      })
      .expect(413);
    expect(updateOwned).not.toHaveBeenCalled();
  });

  it('allows the owner to remove another member or themselves with no response body', async () => {
    const response = await request(app.getHttpServer())
      .delete(`${PATH}/members/${MEMBER_ID}`)
      .expect(204);
    expect(response.text).toBe('');
    expect(removeMember).toHaveBeenCalledWith(GROUP_ID, MEMBER_ID, OWNER_ID);
    await request(app.getHttpServer()).delete(`${PATH}/members/${OWNER_ID}`).expect(204);
  });

  it('rejects non-owners and maps missing groups or memberships to 404', async () => {
    process.env.MOCK_AUTH_USER_ID = MEMBER_ID;
    await request(app.getHttpServer()).patch(PATH).field('name', 'Outro nome').expect(403);
    removeMember.mockRejectedValue(new GroupManagementError('forbidden', 'Only owner'));
    await request(app.getHttpServer()).delete(`${PATH}/members/${OWNER_ID}`).expect(403);
    findManagementState.mockResolvedValue(null);
    await request(app.getHttpServer()).patch(PATH).field('name', 'Outro nome').expect(404);
    removeMember.mockResolvedValue(false);
    await request(app.getHttpServer()).delete(`${PATH}/members/${MEMBER_ID}`).expect(404);
  });

  it('validates both UUID parameters and requires authentication', async () => {
    await request(app.getHttpServer()).patch('/groups/invalid').field('name', 'Nome').expect(400);
    await request(app.getHttpServer()).delete(`${PATH}/members/invalid`).expect(400);
    await request(app.getHttpServer()).delete(`/groups/invalid/members/${MEMBER_ID}`).expect(400);
    process.env.MOCK_AUTH_ENABLED = 'false';
    await request(app.getHttpServer()).patch(PATH).field('name', 'Nome').expect(401);
    await request(app.getHttpServer()).delete(`${PATH}/members/${MEMBER_ID}`).expect(401);
    expect(updateOwned).not.toHaveBeenCalled();
    expect(removeMember).not.toHaveBeenCalled();
  });

  it('documents editing and removal without altering the existing routes', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const paths = response.body.paths;
    expect(paths['/groups/{groupId}'].get).toBeDefined();
    expect(Object.keys(paths['/groups/{groupId}'].patch.responses).sort()).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '413',
      '500',
    ]);
    expect(
      Object.keys(paths['/groups/{groupId}/members/{userId}'].delete.responses).sort()
    ).toEqual(['204', '400', '401', '403', '404', '500']);
  });
});
