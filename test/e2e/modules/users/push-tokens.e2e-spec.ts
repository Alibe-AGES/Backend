import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';

const AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Push token endpoint (e2e)', () => {
  let app: INestApplication;
  const updateExpoPushToken = jest.fn();
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;
  const previousMockAuthUserId = process.env.MOCK_AUTH_USER_ID;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(UserProfileRepository)
      .useValue({ updateExpoPushToken })
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousMockAuthUserId);
    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = AUTHENTICATED_USER_ID;
    updateExpoPushToken.mockReset();
    updateExpoPushToken.mockResolvedValue(undefined);
  });

  it('associates an Expo push token with the authenticated user', async () => {
    await request(app.getHttpServer())
      .put('/api/users/me/push-token')
      .send({ token: 'ExpoPushToken[test-token]' })
      .expect(204);

    expect(updateExpoPushToken).toHaveBeenCalledWith(
      AUTHENTICATED_USER_ID,
      'ExpoPushToken[test-token]'
    );
  });

  it('rejects malformed push tokens', async () => {
    await request(app.getHttpServer())
      .put('/api/users/me/push-token')
      .send({ token: 'not-an-expo-token' })
      .expect(400);

    expect(updateExpoPushToken).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .put('/api/users/me/push-token')
      .send({ token: 'ExpoPushToken[test-token]' })
      .expect(401);

    expect(updateExpoPushToken).not.toHaveBeenCalled();
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
