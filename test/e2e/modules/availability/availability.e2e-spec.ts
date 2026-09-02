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
const MOCK_AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Availability mock endpoint (e2e)', () => {
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

  it('registers availability with an optional time interval', async () => {
    const response = await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14', startTime: '18:00', endTime: '22:00' })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      groupId: DEMO_GROUP_ID,
      userId: MOCK_AUTHENTICATED_USER_ID,
      date: '2026-05-14',
      startTime: '18:00',
      endTime: '22:00',
    });
  });

  it('registers full-day availability when the interval is omitted', async () => {
    const response = await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14' })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      groupId: DEMO_GROUP_ID,
      userId: MOCK_AUTHENTICATED_USER_ID,
      date: '2026-05-14',
      startTime: null,
      endTime: null,
    });
  });

  it('rejects invalid group, date and incomplete or inverted intervals', async () => {
    await request(app.getHttpServer())
      .post('/groups/not-a-uuid/availabilities')
      .send({ date: '2026-05-14' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-02-30' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14', startTime: '18:00' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14', startTime: '22:00', endTime: '18:00' })
      .expect(400);
  });

  it('documents the endpoint and its status codes in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/groups/{groupId}/availabilities'].post;

    expect(operation).toBeDefined();
    expect(Object.keys(operation.responses).sort()).toEqual(['201', '400', '500']);
  });
});
