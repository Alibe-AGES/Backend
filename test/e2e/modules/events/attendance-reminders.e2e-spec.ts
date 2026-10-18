import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { SendAttendanceRemindersUseCase } from '../../../../src/modules/events/application/send-attendance-reminders.use-case';

describe('Attendance reminder test endpoint (e2e)', () => {
  let app: INestApplication;
  const execute = jest.fn();
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;
  const previousNotificationTestEnabled = process.env.ENABLE_NOTIFICATION_TEST_ENDPOINT;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(SendAttendanceRemindersUseCase)
      .useValue({ execute })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('ENABLE_NOTIFICATION_TEST_ENDPOINT', previousNotificationTestEnabled);
    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.ENABLE_NOTIFICATION_TEST_ENDPOINT = 'true';
    execute.mockReset();
    execute.mockResolvedValue({
      date: '2026-10-18',
      events: 1,
      notifications: { attempted: 2, sent: 2, failed: 0 },
    });
  });

  it('executes the same reminder use case used by the daily scheduler', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/notifications/test/attendance-reminders')
      .expect(202);

    expect(response.body).toEqual({
      date: '2026-10-18',
      events: 1,
      notifications: { attempted: 2, sent: 2, failed: 0 },
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('requires an authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .post('/api/notifications/test/attendance-reminders')
      .expect(401);

    expect(execute).not.toHaveBeenCalled();
  });

  it('is hidden when notification test endpoints are disabled', async () => {
    process.env.ENABLE_NOTIFICATION_TEST_ENDPOINT = 'false';

    await request(app.getHttpServer())
      .post('/api/notifications/test/attendance-reminders')
      .expect(404);

    expect(execute).not.toHaveBeenCalled();
  });

  it('documents the endpoint in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/api/notifications/test/attendance-reminders'].post;

    expect(Object.keys(operation.responses).sort()).toEqual(['202', '401', '404']);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
