import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { GroupNotificationRepository } from '../../../../src/modules/groups/domain/group-notification.repository';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MISSING_GROUP_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FORBIDDEN_GROUP_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOTIFICATION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Group notification wall endpoint (e2e)', () => {
  let app: INestApplication;
  const findMembership = jest.fn();
  const findUnreadPage = jest.fn();
  const markAllAsRead = jest.fn();
  const markAsRead = jest.fn();
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(GroupRepository)
      .useValue({ findMembership })
      .overrideProvider(GroupNotificationRepository)
      .useValue({ findUnreadPage, markAllAsRead, markAsRead })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    findMembership.mockReset();
    findMembership.mockImplementation(async (groupId: string) => {
      if (groupId === MISSING_GROUP_ID) return null;
      if (groupId === FORBIDDEN_GROUP_ID) return false;
      return true;
    });
    findUnreadPage.mockReset();
    findUnreadPage.mockImplementation(
      async (_groupId: string, _userId: string, page: number, limit: number) => ({
        items: [
          {
            id: NOTIFICATION_ID,
            type: 'createdEvent',
            message: 'O evento "Cinema" foi criado para o dia 18/10/2026.',
            createdAt: new Date('2026-10-18T18:00:00.000Z'),
            eventId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          },
        ],
        page,
        limit,
        total: 1,
        totalPages: 1,
      })
    );
    markAllAsRead.mockReset();
    markAllAsRead.mockResolvedValue(undefined);
    markAsRead.mockReset();
    markAsRead.mockResolvedValue(true);
  });

  it('uses page 1 and 7 items by default', async () => {
    const response = await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/notifications`)
      .expect(200);

    expect(response.body).toEqual({
      items: [
        {
          id: NOTIFICATION_ID,
          type: 'createdEvent',
          message: 'O evento "Cinema" foi criado para o dia 18/10/2026.',
          createdAt: '2026-10-18T18:00:00.000Z',
          eventId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        },
      ],
      pagination: { page: 1, limit: 7, total: 1, totalPages: 1 },
    });
    expect(findUnreadPage).toHaveBeenCalledWith(GROUP_ID, USER_ID, 1, 7);
  });

  it('accepts a configurable page and page size', async () => {
    await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/notifications?page=3&limit=10`)
      .expect(200);

    expect(findUnreadPage).toHaveBeenCalledWith(GROUP_ID, USER_ID, 3, 10);
  });

  it.each(['page=0', 'limit=0', 'limit=51', 'page=text', 'extra=value'])(
    'rejects invalid pagination: %s',
    async (query) => {
      await request(app.getHttpServer())
        .get(`/groups/${GROUP_ID}/notifications?${query}`)
        .expect(400);
    }
  );

  it('protects the shared wall by group membership', async () => {
    await request(app.getHttpServer()).get(`/groups/${MISSING_GROUP_ID}/notifications`).expect(404);
    await request(app.getHttpServer())
      .get(`/groups/${FORBIDDEN_GROUP_ID}/notifications`)
      .expect(403);
  });

  it('requires authentication', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer()).get(`/groups/${GROUP_ID}/notifications`).expect(401);
    expect(findUnreadPage).not.toHaveBeenCalled();
  });

  it('marks one notification as read only for the authenticated user', async () => {
    await request(app.getHttpServer())
      .patch(`/groups/${GROUP_ID}/notifications/${NOTIFICATION_ID}/read`)
      .expect(204);

    expect(markAsRead).toHaveBeenCalledWith(GROUP_ID, NOTIFICATION_ID, USER_ID, expect.any(Date));
  });

  it('marks all current group notifications as read for the authenticated user', async () => {
    await request(app.getHttpServer()).patch(`/groups/${GROUP_ID}/notifications/read`).expect(204);

    expect(markAllAsRead).toHaveBeenCalledWith(GROUP_ID, USER_ID, expect.any(Date));
  });

  it('returns 404 when a notification does not belong to the group', async () => {
    markAsRead.mockResolvedValue(false);

    await request(app.getHttpServer())
      .patch(`/groups/${GROUP_ID}/notifications/${NOTIFICATION_ID}/read`)
      .expect(404);
  });

  it('protects the read endpoints by membership and authentication', async () => {
    await request(app.getHttpServer())
      .patch(`/groups/${FORBIDDEN_GROUP_ID}/notifications/read`)
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/groups/${MISSING_GROUP_ID}/notifications/${NOTIFICATION_ID}/read`)
      .expect(404);

    process.env.MOCK_AUTH_ENABLED = 'false';
    await request(app.getHttpServer()).patch(`/groups/${GROUP_ID}/notifications/read`).expect(401);
  });

  it('documents the endpoint in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/groups/{groupId}/notifications'].get;
    const markAllOperation = swagger.body.paths['/groups/{groupId}/notifications/read'].patch;
    const markOneOperation =
      swagger.body.paths['/groups/{groupId}/notifications/{notificationId}/read'].patch;

    expect(Object.keys(operation.responses).sort()).toEqual(['200', '400', '401', '403', '404']);
    expect(Object.keys(markAllOperation.responses).sort()).toEqual([
      '204',
      '400',
      '401',
      '403',
      '404',
    ]);
    expect(Object.keys(markOneOperation.responses).sort()).toEqual([
      '204',
      '400',
      '401',
      '403',
      '404',
    ]);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
