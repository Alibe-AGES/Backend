import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const PATH = `/groups/${GROUP_ID}/leave`;

describe('Leave group (e2e)', () => {
  let app: INestApplication;
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
      .overrideProvider(GroupRepository)
      .useValue({ removeMember })
      .compile();
    app = module.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    removeMember.mockReset().mockResolvedValue(true);
  });

  afterAll(async () => {
    if (previousAuth === undefined) delete process.env.MOCK_AUTH_ENABLED;
    else process.env.MOCK_AUTH_ENABLED = previousAuth;
    if (previousUser === undefined) delete process.env.MOCK_AUTH_USER_ID;
    else process.env.MOCK_AUTH_USER_ID = previousUser;
    await app.close();
  });

  it('removes the authenticated membership without an acting owner and returns no body', async () => {
    const response = await request(app.getHttpServer()).post(PATH).expect(204);

    expect(response.text).toBe('');
    expect(removeMember).toHaveBeenCalledWith(GROUP_ID, USER_ID);
  });

  it('returns 404 when the group does not exist or the user is not a member', async () => {
    removeMember.mockResolvedValue(false);

    await request(app.getHttpServer()).post(PATH).expect(404);
  });

  it('rejects an invalid UUID before accessing persistence', async () => {
    await request(app.getHttpServer()).post('/groups/invalid/leave').expect(400);

    expect(removeMember).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer()).post(PATH).expect(401);

    expect(removeMember).not.toHaveBeenCalled();
  });

  it('preserves unexpected persistence errors as 500', async () => {
    removeMember.mockRejectedValue(new Error('Database unavailable'));

    await request(app.getHttpServer()).post(PATH).expect(500);
  });

  it('documents POST with no request body and the expected responses', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = response.body.paths['/groups/{groupId}/leave'].post;

    expect(operation.requestBody).toBeUndefined();
    expect(Object.keys(operation.responses).sort()).toEqual(['204', '400', '401', '404', '500']);
  });
});
