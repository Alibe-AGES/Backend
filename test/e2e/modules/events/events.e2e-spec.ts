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
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const ORIGINAL_IMAGE_KEY = `events/${EVENT_ID}/images/original.jpg`;
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('Events endpoint (e2e)', () => {
  let app: INestApplication;
  let storage: ObjectStorage;
  let events: InMemoryEventRepository;
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

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousMockAuthUserId);
    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = OWNER_ID;
    events.set(
      new Event({
        id: EVENT_ID,
        name: 'Jantar',
        timeslot: new Date('2026-10-15T20:00:00.000Z'),
        image: ORIGINAL_IMAGE_KEY,
        budgetStart: '50.00',
        budgetEnd: '120.00',
        status: 'pending',
        groupId: '33333333-3333-4333-8333-333333333333',
        location: {
          id: '44444444-4444-4444-8444-444444444444',
          description: 'Casa da Ana',
          manuallyCreated: true,
        },
        proposals: [{ id: '55555555-5555-4555-8555-555555555555', ownerId: OWNER_ID }],
        createdAt: new Date('2026-09-22T18:30:00.000Z'),
        updatedAt: new Date('2026-09-22T18:30:00.000Z'),
      })
    );
  });

  it('updates an event owned by the authenticated user and returns the updated shape', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .send({ name: 'Jantar atualizado', budgetStart: null })
      .expect(200);

    expect(response.body).toMatchObject({
      id: EVENT_ID,
      name: 'Jantar atualizado',
      date: '2026-10-15',
      time: '20:00',
      image: `/api/events/${EVENT_ID}/image`,
      budgetStart: null,
      budgetEnd: '120.00',
      proposal: { id: '55555555-5555-4555-8555-555555555555', ownerId: OWNER_ID },
      createdAt: '2026-09-22T18:30:00.000Z',
      updatedAt: '2026-09-23T14:00:00.000Z',
    });

    expect(Number.isNaN(Date.parse(response.body.updatedAt))).toBe(false);
    expect(Date.parse(response.body.updatedAt)).toBeGreaterThan(
      Date.parse(response.body.createdAt)
    );
  });

  it('receives an image file and persists only its storage key', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .field('name', 'Jantar com nova imagem')
      .attach('image', PNG_BYTES, {
        filename: 'event.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(response.body.name).toBe('Jantar com nova imagem');
    expect(response.body.image).toBe(`/api/events/${EVENT_ID}/image`);

    const updatedEvent = await events.findById(EVENT_ID);
    expect(updatedEvent?.image).toMatch(
      new RegExp(`^events/${EVENT_ID}/images/[0-9a-f-]{36}\\.png$`, 'i')
    );
    await expect(storage.findByKey(updatedEvent?.image ?? '')).resolves.toEqual({
      bytes: PNG_BYTES,
      contentType: 'image/png',
    });
  });

  it('updates an event when the image is the only supplied field', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .attach('image', PNG_BYTES, {
        filename: 'event.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(response.body.image).toBe(`/api/events/${EVENT_ID}/image`);
  });

  it('rejects a file that is not an image', async () => {
    await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .attach('image', Buffer.from('not-an-image'), {
        filename: 'event.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('rejects an image supplied as a string', async () => {
    await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .send({ image: 'https://example.com/event.png' })
      .expect(400);
  });

  it('rejects an empty body', async () => {
    await request(app.getHttpServer()).patch(`/api/events/${EVENT_ID}`).send({}).expect(400);
  });

  it('rejects an invalid event id', async () => {
    await request(app.getHttpServer())
      .patch('/api/events/not-a-uuid')
      .send({ name: 'Novo' })
      .expect(400);
  });

  it('rejects a user who does not own an associated proposal', async () => {
    process.env.MOCK_AUTH_USER_ID = '99999999-9999-4999-8999-999999999999';

    await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .send({ name: 'Sem permissão' })
      .expect(403);
  });

  it('rejects requests without an authenticated user', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .patch(`/api/events/${EVENT_ID}`)
      .send({ name: 'Sem autenticação' })
      .expect(401);
  });

  it('documents the image as a binary multipart field in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/api/events/{eventId}'].patch;
    const schema = operation.requestBody.content['multipart/form-data'].schema;

    expect(schema.properties.image).toEqual({ type: 'string', format: 'binary' });
    expect(Object.keys(operation.responses).sort()).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '413',
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
