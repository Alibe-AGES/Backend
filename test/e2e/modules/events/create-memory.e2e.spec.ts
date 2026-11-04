import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { Event } from '../../../../src/modules/events/domain/event.entity';
import { EventRepository } from '../../../../src/modules/events/domain/event.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';
const IMAGE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Event memories endpoint (e2e)', () => {
  let app: INestApplication;
  let events: InMemoryEventRepository;
  let storage: ObjectStorage;
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
      .overrideProvider(EventRepository)
      .useClass(InMemoryEventRepository)
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    events = moduleFixture.get(EventRepository) as InMemoryEventRepository;
    storage = moduleFixture.get(ObjectStorage);
    setupApplication(app);
    await app.init();
  });

  beforeEach(async () => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    events.set(createEvent());
    events.setGroupMembers(GROUP_ID, [USER_ID]);
  });

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousMockAuthUserId);
    await app.close();
  });

  it('successfully creates a memory when valid image and member context are provided', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/events/${EVENT_ID}/memories`)
      .attach('image', IMAGE_BYTES, { filename: 'memory.png', contentType: 'image/png' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      eventId: EVENT_ID,
      pictureUrl: expect.stringMatching(new RegExp(`^api/events/${EVENT_ID}/memories/.+/image$`)),
    });
  });

  it('rejects a request when the image file is missing', async () => {
    await request(app.getHttpServer())
      .post(`/api/events/${EVENT_ID}/memories`)
      .expect(400);
  });

  it('denies a user who does not belong to the event group', async () => {
    process.env.MOCK_AUTH_USER_ID = OTHER_USER_ID;

    await request(app.getHttpServer())
      .post(`/api/events/${EVENT_ID}/memories`)
      .attach('image', IMAGE_BYTES, { filename: 'memory.png', contentType: 'image/png' })
      .expect(403);
  });

  it('returns 404 when the target event does not exist', async () => {
    const unknownEventId = '99999999-9999-4999-8999-999999999999';

    await request(app.getHttpServer())
      .post(`/api/events/${unknownEventId}/memories`)
      .attach('image', IMAGE_BYTES, { filename: 'memory.png', contentType: 'image/png' })
      .expect(404);
  });

  it('rejects a request without an authenticated user', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .post(`/api/events/${EVENT_ID}/memories`)
      .attach('image', IMAGE_BYTES, { filename: 'memory.png', contentType: 'image/png' })
      .expect(401);
  });

  it('validates the event id format and documents the endpoint in Swagger', async () => {
    await request(app.getHttpServer())
      .post('/api/events/not-a-uuid/memories')
      .attach('image', IMAGE_BYTES, { filename: 'memory.png', contentType: 'image/png' })
      .expect(400);

    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths[`/api/events/{eventId}/memories`]?.post;

    expect(operation).toBeDefined();
    expect(Object.keys(operation.responses).sort()).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '413',
      '500',
    ]);
  });
});

function createEvent(): Event {
  return new Event({
    id: EVENT_ID,
    name: 'Jantar',
    timeslot: new Date('2026-10-15T20:00:00.000Z'),
    image: null,
    budgetStart: '50.00',
    budgetEnd: '120.00',
    status: 'pending',
    groupId: GROUP_ID,
    location: {
      id: '44444444-4444-4444-8444-444444444444',
      description: 'Casa da Ana',
      manuallyCreated: true,
    },
    proposals: [{ id: '55555555-5555-4555-8555-555555555555', ownerId: USER_ID }],
    createdAt: new Date('2026-09-22T18:30:00.000Z'),
    updatedAt: new Date('2026-09-22T18:30:00.000Z'),
  });
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}