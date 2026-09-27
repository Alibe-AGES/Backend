import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';
import { UserImageRepository } from '../../../../src/modules/users/domain/user-image.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const IMAGE_KEY = `users/${USER_ID}/profile-picture.png`;
const IMAGE_BYTES = Buffer.from([137, 80, 78, 71]);
const VALID_PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('User profile picture endpoint (e2e)', () => {
  let app: INestApplication;
  let storage: ObjectStorage;
  const findProfilePictureAccess = jest.fn();
  const updateProfilePicture = jest.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ExampleRepository)
      .useClass(InMemoryExampleRepository)
      .overrideProvider(UserImageRepository)
      .useValue({ findProfilePictureAccess, updateProfilePicture })
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    setupApplication(app);
    await app.init();
    storage = moduleFixture.get(ObjectStorage);
    await storage.save({
      key: IMAGE_KEY,
      bytes: IMAGE_BYTES,
      contentType: 'image/png',
    });
  });

  beforeEach(() => {
    findProfilePictureAccess.mockReset();
    findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      requesterCanAccess: true,
    });
    updateProfilePicture.mockReset();
    updateProfilePicture.mockResolvedValue({ previousImageKey: null });
  });

  afterAll(async () => {
    await app.close();
  });

  it('stores the profile picture for the authenticated user', async () => {
    await request(app.getHttpServer())
      .put('/users/me/profile-picture')
      .attach('profilePic', VALID_PNG_BYTES, {
        filename: 'profile.png',
        contentType: 'image/png',
      })
      .expect(200)
      .expect({
        profilePic: `/users/${AUTHENTICATED_USER_ID}/profile-picture`,
      });

    expect(updateProfilePicture).toHaveBeenCalledWith(
      AUTHENTICATED_USER_ID,
      expect.stringMatching(
        new RegExp(`^users/${AUTHENTICATED_USER_ID}/profile-pictures/[0-9a-f-]{36}\\.png$`, 'i')
      )
    );

    const imageKey = updateProfilePicture.mock.calls[0][1] as string;
    await expect(storage.findByKey(imageKey)).resolves.toEqual({
      bytes: VALID_PNG_BYTES,
      contentType: 'image/png',
    });
  });

  it('requires a valid profilePic file', async () => {
    await request(app.getHttpServer()).put('/users/me/profile-picture').expect(400);

    await request(app.getHttpServer())
      .put('/users/me/profile-picture')
      .attach('profilePic', Buffer.from('not-an-image'), {
        filename: 'profile.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    expect(updateProfilePicture).not.toHaveBeenCalled();
  });

  it('removes the uploaded object when the authenticated user does not exist', async () => {
    updateProfilePicture.mockResolvedValue(null);

    await request(app.getHttpServer())
      .put('/users/me/profile-picture')
      .attach('profilePic', VALID_PNG_BYTES, {
        filename: 'profile.png',
        contentType: 'image/png',
      })
      .expect(404);

    const imageKey = updateProfilePicture.mock.calls[0][1] as string;
    await expect(storage.findByKey(imageKey)).resolves.toBeNull();
  });

  it('returns image bytes when the authenticated user has access', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${USER_ID}/profile-picture`)
      .expect('Content-Type', /image\/png/)
      .expect('Content-Length', String(IMAGE_BYTES.byteLength))
      .expect('Cache-Control', 'private, max-age=300')
      .expect(200);

    expect(response.body).toEqual(IMAGE_BYTES);
  });

  it('denies users who cannot see the target profile', async () => {
    findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      requesterCanAccess: false,
    });

    await request(app.getHttpServer()).get(`/users/${USER_ID}/profile-picture`).expect(403);
  });

  it('returns 404 when the target user has no profile picture', async () => {
    findProfilePictureAccess.mockResolvedValue({
      imageKey: null,
      requesterCanAccess: true,
    });

    await request(app.getHttpServer()).get(`/users/${USER_ID}/profile-picture`).expect(404);
  });

  it('validates the user id and documents the endpoint in Swagger', async () => {
    await request(app.getHttpServer()).get('/users/not-a-uuid/profile-picture').expect(400);

    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/users/{userId}/profile-picture'].get;

    expect(operation).toBeDefined();
    expect(Object.keys(operation.responses).sort()).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '500',
    ]);

    const updateOperation = swagger.body.paths['/users/me/profile-picture'].put;
    expect(updateOperation.requestBody.content['multipart/form-data'].schema.required).toEqual([
      'profilePic',
    ]);
    expect(Object.keys(updateOperation.responses).sort()).toEqual([
      '200',
      '400',
      '401',
      '404',
      '413',
      '500',
    ]);
    expect(updateOperation.security).toEqual(
      expect.arrayContaining([{ 'better-auth': [] }, { 'better-auth-bearer': [] }])
    );
  });
});
