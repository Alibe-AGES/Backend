import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';

const AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Current user endpoint (e2e)', () => {
  let app: INestApplication;
  const findCurrentUserSummary = jest.fn();
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
      .useValue({ findCurrentUserSummary })
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
    findCurrentUserSummary.mockReset();
    findCurrentUserSummary.mockResolvedValue({
      id: AUTHENTICATED_USER_ID,
      name: 'Ana Beatriz Silva',
      email: 'ana.silva@example.com',
      completedEvents: 8,
      eventsInDecision: 2,
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      image: 'https://example.com/ana.jpg',
    });
  });

  it('returns the public profile and event summary for the Better Auth session user', async () => {
    const response = await request(app.getHttpServer()).get('/api/users/me').expect(200);

    expect(findCurrentUserSummary).toHaveBeenCalledWith(AUTHENTICATED_USER_ID, expect.any(Date));
    expect(response.body).toEqual({
      id: AUTHENTICATED_USER_ID,
      name: 'Ana Beatriz Silva',
      email: 'ana.silva@example.com',
      completedEvents: 8,
      eventsInDecision: 2,
      createdAt: '2026-09-01T12:00:00.000Z',
      image: 'https://example.com/ana.jpg',
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('accounts');
    expect(response.body).not.toHaveProperty('sessions');
  });

  it('returns 401 when there is no authenticated Better Auth session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer()).get('/api/users/me').expect(401);
    expect(findCurrentUserSummary).not.toHaveBeenCalled();
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
