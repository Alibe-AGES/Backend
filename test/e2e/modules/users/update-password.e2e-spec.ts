import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';

const AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Update password endpoint (e2e)', () => {
  let app: INestApplication;
  const verifyPassword = jest.fn();
  const updatePassword = jest.fn();
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
      .useValue({ verifyPassword, updatePassword })
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
    verifyPassword.mockReset();
    verifyPassword.mockImplementation(async (_userId: string, password: string) => {
      return password === 'senha-segura';
    });
    updatePassword.mockReset();
    updatePassword.mockResolvedValue(undefined);
  });

  it('changes the password of the authenticated user', async () => {
    await request(app.getHttpServer())
      .put('/users/me/update-password')
      .send({ password: 'senha-segura', newPassword: 'nova-senha-segura' })
      .expect(200);

    expect(verifyPassword).toHaveBeenCalledWith(AUTHENTICATED_USER_ID, 'senha-segura');
    expect(updatePassword).toHaveBeenCalledWith(AUTHENTICATED_USER_ID, 'nova-senha-segura');
  });

  it('returns 400 when the current password is incorrect', async () => {
    const response = await request(app.getHttpServer())
      .put('/users/me/update-password')
      .send({ password: 'senha-errada', newPassword: 'nova-senha-segura' })
      .expect(400);

    expect(response.body.message).toBe('Senha atual incorreta');
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a new password shorter than 8 characters',
      { password: 'senha-segura', newPassword: '1234567' },
    ],
    [
      'a new password longer than 128 characters',
      { password: 'senha-segura', newPassword: 'a'.repeat(129) },
    ],
    ['a missing current password', { newPassword: 'nova-senha-segura' }],
    ['unknown fields', { password: 'senha-segura', newPassword: 'nova-senha-segura', userId: 'x' }],
  ])('returns 400 for %s', async (_case, body) => {
    await request(app.getHttpServer()).put('/users/me/update-password').send(body).expect(400);

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .put('/users/me/update-password')
      .send({ password: 'senha-segura', newPassword: 'nova-senha-segura' })
      .expect(401);

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(updatePassword).not.toHaveBeenCalled();
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
