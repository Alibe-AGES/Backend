import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

describe('Better Auth configuration (e2e)', () => {
  let app: INestApplication;
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;

  beforeAll(async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

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
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();

    if (previousMockAuthEnabled === undefined) {
      delete process.env.MOCK_AUTH_ENABLED;
    } else {
      process.env.MOCK_AUTH_ENABLED = previousMockAuthEnabled;
    }
  });

  it('exposes get-session and returns null without a session cookie', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .expect('Cache-Control', /no-store/)
      .expect(200)
      .expect('null');
  });

  it('returns the current session when the cookie is valid', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', 'better-auth.session_token=valid-session-token')
      .expect('Cache-Control', /no-store/)
      .expect(200)
      .expect({
        session: {
          id: '2c058d88-11df-47bc-8603-c64af764f700',
          userId: '11111111-1111-4111-8111-111111111111',
          token: 'valid-session-token',
          expiresAt: '2026-09-28T18:30:00.000Z',
          createdAt: '2026-09-21T18:30:00.000Z',
          updatedAt: '2026-09-21T18:30:00.000Z',
          ipAddress: '192.168.0.10',
          userAgent: 'Alibe/1.0',
        },
        user: {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Ana Beatriz Silva',
          email: 'ana.silva@example.com',
          emailVerified: false,
          image: null,
          createdAt: '2026-09-01T12:00:00.000Z',
          updatedAt: '2026-09-21T18:30:00.000Z',
        },
      });
  });

  it('returns the current session with a bearer token for Swagger clients', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Authorization', 'Bearer valid-session-token')
      .expect('Cache-Control', /no-store/)
      .expect(200);

    expect(response.body.session.token).toBe('valid-session-token');
    expect(response.body.user.id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('returns null when the session cookie is expired', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/get-session')
      .set('Cookie', 'better-auth.session_token=expired-session-token')
      .expect('Cache-Control', /no-store/)
      .expect(200)
      .expect('null');
  });

  it('creates a user without creating a session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Ana Nova',
        email: 'Ana.Nova@Example.COM',
        password: 'senha-segura',
      })
      .expect(200);

    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body).toEqual({
      token: null,
      user: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Ana Nova',
        email: 'ana.nova@example.com',
        emailVerified: false,
        image: null,
        createdAt: '2026-09-23T12:00:00.000Z',
        updatedAt: '2026-09-23T12:00:00.000Z',
      },
    });
  });

  it('does not reveal whether a sign-up email already exists', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Existing User',
        email: 'existing@example.com',
        password: 'senha-segura',
      })
      .expect(200);

    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body).toEqual(
      expect.objectContaining({
        token: null,
        user: expect.objectContaining({ email: 'existing@example.com' }),
      })
    );
  });

  it.each([
    {
      name: 'invalid email',
      email: 'email-invalido',
      password: 'senha-segura',
      code: 'INVALID_EMAIL',
    },
    {
      name: 'short password',
      email: 'nova@example.com',
      password: 'curta',
      code: 'PASSWORD_TOO_SHORT',
    },
    {
      name: 'long password',
      email: 'nova@example.com',
      password: 'a'.repeat(129),
      code: 'PASSWORD_TOO_LONG',
    },
  ])('rejects sign-up with $name', async ({ email, password, code }) => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ name: 'Nova Pessoa', email, password })
      .expect(400);

    expect(response.body).toEqual(expect.objectContaining({ code }));
  });

  it('creates a session when the email and password are valid', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: 'ana.silva@example.com',
        password: 'senha-segura',
      })
      .expect('Cache-Control', /no-store/)
      .expect(200);

    expect(response.headers['set-cookie']).toEqual([
      expect.stringContaining('better-auth.session_token=opaque-session-token'),
    ]);
    expect(response.body).toEqual({
      redirect: false,
      token: 'opaque-session-token',
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Ana Beatriz Silva',
        email: 'ana.silva@example.com',
        emailVerified: false,
        image: null,
        createdAt: '2026-09-01T12:00:00.000Z',
        updatedAt: '2026-09-21T18:30:00.000Z',
      },
    });
  });

  it('rejects invalid login credentials without revealing which field is wrong', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: 'ana.silva@example.com',
        password: 'senha-incorreta',
      })
      .expect(401)
      .expect({
        code: 'INVALID_EMAIL_OR_PASSWORD',
        message: 'Invalid email or password',
      });
  });

  it('protects application endpoints without a valid session', async () => {
    await request(app.getHttpServer()).get('/groups').expect(401);
  });

  it('keeps metrics and API documentation public', async () => {
    await request(app.getHttpServer()).get('/metrics').expect(200);
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(response.body.paths['/api/auth/get-session'].get).toEqual(
      expect.objectContaining({ operationId: 'getSession' })
    );
    expect(response.body.paths['/api/auth/sign-in/email'].post).toEqual(
      expect.objectContaining({ operationId: 'signInWithEmail' })
    );
    expect(response.body.paths['/api/auth/sign-up/email'].post).toEqual(
      expect.objectContaining({ operationId: 'signUpWithEmail' })
    );
    expect(response.body.components.securitySchemes['better-auth-bearer']).toEqual(
      expect.objectContaining({ type: 'http', scheme: 'bearer' })
    );
    expect(response.body.paths['/api/auth/get-session'].get.security).toEqual(
      expect.arrayContaining([{ 'better-auth-bearer': [] }, { 'better-auth': [] }])
    );
  });
});
