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
  const updateName = jest.fn();
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
      .useValue({ findCurrentUserSummary, updateName })
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
      profilePic: 'users/11111111-1111-4111-8111-111111111111/profile-picture.png',
    });
    updateName.mockReset();
    updateName.mockImplementation(async (_userId: string, name: string) => ({ name }));
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
      profilePic: `/users/${AUTHENTICATED_USER_ID}/profile-picture`,
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

  it('updates the name of the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .put('/api/users/me')
      .send({ name: '  Ana Silva  ' })
      .expect(201);

    expect(updateName).toHaveBeenCalledWith(AUTHENTICATED_USER_ID, 'Ana Silva');
    expect(response.body).toEqual({ name: 'Ana Silva' });
  });

  it.each([
    ['a missing name', {}],
    ['a blank name', { name: '   ' }],
    ['a name longer than 100 characters', { name: 'a'.repeat(101) }],
    ['unknown fields', { name: 'Ana Silva', email: 'outro@example.com' }],
  ])('returns 400 for %s', async (_case, body) => {
    await request(app.getHttpServer()).put('/api/users/me').send(body).expect(400);

    expect(updateName).not.toHaveBeenCalled();
  });

  it('returns 404 when the authenticated user no longer exists', async () => {
    updateName.mockResolvedValue(null);

    await request(app.getHttpServer()).put('/api/users/me').send({ name: 'Ana Silva' }).expect(404);
  });

  it('returns 401 when updating without an authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer()).put('/api/users/me').send({ name: 'Ana Silva' }).expect(401);
    expect(updateName).not.toHaveBeenCalled();
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
