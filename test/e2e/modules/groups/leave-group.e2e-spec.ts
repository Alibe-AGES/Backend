import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const PATH = `/groups/${GROUP_ID}/leave`;

describe('Leave group (e2e)', () => {
  let app: INestApplication;
  const deleteMany = jest.fn();
  // removeMember trava o grupo (SELECT ... FOR UPDATE) dentro de uma transação antes de apagar o vínculo.
  const transaction = {
    $queryRaw: jest.fn().mockResolvedValue([{ ownerId: null, profilePic: null }]),
    userGroup: { deleteMany },
  };
  const previousAuth = process.env.MOCK_AUTH_ENABLED;
  const previousUser = process.env.MOCK_AUTH_USER_ID;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({
        $transaction: (callback: (tx: typeof transaction) => unknown) => callback(transaction),
      })
      .compile();
    app = module.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    deleteMany.mockReset().mockResolvedValue({ count: 1 });
  });

  afterAll(async () => {
    if (previousAuth === undefined) delete process.env.MOCK_AUTH_ENABLED;
    else process.env.MOCK_AUTH_ENABLED = previousAuth;
    if (previousUser === undefined) delete process.env.MOCK_AUTH_USER_ID;
    else process.env.MOCK_AUTH_USER_ID = previousUser;
    await app.close();
  });

  it('removes the authenticated membership without a request or response body', async () => {
    const response = await request(app.getHttpServer()).put(PATH).expect(201);
    expect(response.text).toBe('');
    expect(deleteMany).toHaveBeenCalledWith({ where: { groupId: GROUP_ID, userId: USER_ID } });
  });

  it('returns 400 when no membership was removed', async () => {
    deleteMany.mockResolvedValue({ count: 0 });
    await request(app.getHttpServer()).put(PATH).expect(400);
  });

  it('rejects an invalid UUID before accessing persistence', async () => {
    await request(app.getHttpServer()).put('/groups/invalid/leave').expect(400);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';
    await request(app.getHttpServer()).put(PATH).expect(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('preserves unexpected persistence errors as 500', async () => {
    deleteMany.mockRejectedValue(new Error('Database unavailable'));
    await request(app.getHttpServer()).put(PATH).expect(500);
  });

  it('documents PUT with no request body and the expected responses', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = response.body.paths['/groups/{groupId}/leave'].put;
    expect(operation.requestBody).toBeUndefined();
    expect(Object.keys(operation.responses).sort()).toEqual(['201', '400', '401', '500']);
  });
});
