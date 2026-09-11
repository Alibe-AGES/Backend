import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { AvailabilityRepository } from '../../../../src/modules/availability/domain/availability.repository';
import { InMemoryAvailabilityRepository } from '../../../helpers/in-memory-availability.repository';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';

const DEMO_GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MOCK_AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('AvailabilityController (e2e)', () => {
  let app: INestApplication;
  let availabilityRepository: InMemoryAvailabilityRepository;
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;

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
      .overrideProvider(AvailabilityRepository)
      .useClass(InMemoryAvailabilityRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    availabilityRepository = moduleFixture.get(
      AvailabilityRepository
    ) as InMemoryAvailabilityRepository;
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    if (previousMockAuthEnabled === undefined) {
      delete process.env.MOCK_AUTH_ENABLED;
    } else {
      process.env.MOCK_AUTH_ENABLED = previousMockAuthEnabled;
    }

    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    availabilityRepository.setMembershipResult(true);
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
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      groupId: DEMO_GROUP_ID,
      userId: MOCK_AUTHENTICATED_USER_ID,
      date: '2026-05-14',
      startTime: null,
      endTime: null,
    });
  });

  it('rejects invalid group id format', async () => {
    await request(app.getHttpServer())
      .post('/groups/not-a-uuid/availabilities')
      .send({ date: '2026-05-14' })
      .expect(400);
  });

  it('rejects invalid date format or non-existent dates', async () => {
    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-02-30' })
      .expect(400);
  });

  it('rejects incomplete time interval when only startTime is provided', async () => {
    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14', startTime: '18:00' })
      .expect(400);
  });

  it('rejects inverted time intervals', async () => {
    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14', startTime: '22:00', endTime: '18:00' })
      .expect(400);
  });

  it('rejects a request without an authenticated user', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14' })
      .expect(401);
  });

  it('rejects a user who does not belong to the group', async () => {
    availabilityRepository.setMembershipResult(false);

    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14' })
      .expect(403);
  });

  it('reports a group that does not exist', async () => {
    availabilityRepository.setMembershipResult(null);

    await request(app.getHttpServer())
      .post(`/groups/${DEMO_GROUP_ID}/availabilities`)
      .send({ date: '2026-05-14' })
      .expect(404);
  });

  it('documents the endpoint and its status codes in Swagger', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = response.body.paths['/groups/{groupId}/availabilities'].post;

    expect(operation).toBeDefined();
    expect(Object.keys(operation.responses).sort()).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '500',
    ]);
  });
});
