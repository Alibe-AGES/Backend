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

const DEMO_GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Calendar mock endpoint (e2e)', () => {
  let app: INestApplication;

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
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns only calendar days that contain information for the requested month', async () => {
    const response = await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 5, year: 2026 })
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2026-05-18',
          availableUserIds: [
            '11111111-1111-4111-8111-111111111111',
            '22222222-2222-4222-8222-222222222222',
          ],
          allUsersAvailable: true,
        }),
        expect.objectContaining({
          date: '2026-05-22',
          scheduledEventIds: ['55555555-5555-4555-8555-555555555555'],
          proposalIds: ['66666666-6666-4666-8666-666666666666'],
        }),
      ])
    );
  });

  it('validates groupId, month and year without receiving userId', async () => {
    await request(app.getHttpServer())
      .get('/groups/not-a-uuid/calendar')
      .query({ month: 5, year: 2026 })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 13, year: 2026 })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 5, year: 26 })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 5 })
      .expect(400);
  });

  it('exposes the calendar endpoint in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);

    const operation = swagger.body.paths['/groups/{groupId}/calendar'].get;
    expect(operation).toBeDefined();
    expect(
      Object.keys(swagger.body.components.schemas.CalendarDayResponseDto.properties).sort()
    ).toEqual(
      [
        'allUsersAvailable',
        'availableUserIds',
        'completedEventIds',
        'date',
        'proposalIds',
        'scheduledEventIds',
      ].sort()
    );
    expect(operation.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'month', in: 'query', required: true }),
        expect.objectContaining({ name: 'year', in: 'query', required: true }),
      ])
    );
    expect(Object.keys(operation.responses).sort()).toEqual(['200', '400', '500']);
  });
});
