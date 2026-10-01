import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { EventRepository } from '../../../../src/modules/events/domain/event.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const validBody = {
  name: 'Jantar de aniversário',
  date: '2026-10-15',
  time: '20:00',
  location: 'Rua dos Andradas, 1234, Porto Alegre',
  budgetStart: '50.00',
  budgetEnd: '120.00',
};

describe('Create event endpoint (e2e)', () => {
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

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousMockAuthUserId);
    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = OWNER_ID;
    events.setGroupMembers(GROUP_ID, [OWNER_ID]);
  });

  it('creates an event with its manual location, proposal and owner response', async () => {
    const response = await request(app.getHttpServer())
      .post(`/groups/${GROUP_ID}/events`)
      .send(validBody)
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(String),
      name: 'Jantar de aniversário',
      date: '2026-10-15',
      time: '20:00',
      image: null,
      budgetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      groupId: GROUP_ID,
      location: {
        id: expect.any(String),
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      proposal: {
        id: expect.any(String),
        ownerId: OWNER_ID,
        response: { id: expect.any(String), userId: OWNER_ID, answer: 'yes' },
      },
      createdAt: expect.any(String),
    });
  });

  it('receives an image file as multipart and stores it', async () => {
    const response = await request(app.getHttpServer())
      .post(`/groups/${GROUP_ID}/events`)
      .field('name', validBody.name)
      .field('date', validBody.date)
      .field('time', validBody.time)
      .field('location', validBody.location)
      .attach('image', PNG_BYTES, { filename: 'event.png', contentType: 'image/png' })
      .expect(201);

    expect(response.body.image).toBe(`/api/events/${response.body.id}/image`);

    const createdEvent = await events.findById(response.body.id);
    expect(createdEvent?.image).toMatch(
      new RegExp(`^events/${response.body.id}/images/[0-9a-f-]{36}\\.png$`, 'i')
    );
    await expect(storage.findByKey(createdEvent?.image ?? '')).resolves.toEqual({
      bytes: PNG_BYTES,
      contentType: 'image/png',
    });
  });

  it('rejects a request missing required fields', async () => {
    const response = await request(app.getHttpServer())
      .post(`/groups/${GROUP_ID}/events`)
      .send({ name: 'Sem data' })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      message: 'Nome, dia, horário e endereço são obrigatórios',
      error: 'Bad Request',
    });
  });

  it('rejects an invalid group id', async () => {
    await request(app.getHttpServer())
      .post('/groups/not-a-uuid/events')
      .send(validBody)
      .expect(400);
  });

  it('responds 404 when the group does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/groups/77777777-7777-4777-8777-777777777777/events')
      .send(validBody)
      .expect(404);

    expect(response.body.message).toBe('Grupo não encontrado');
  });

  it('responds 403 when the user does not belong to the group', async () => {
    process.env.MOCK_AUTH_USER_ID = '99999999-9999-4999-8999-999999999999';

    const response = await request(app.getHttpServer())
      .post(`/groups/${GROUP_ID}/events`)
      .send(validBody)
      .expect(403);

    expect(response.body.message).toBe('O usuário não pertence a este grupo');
  });

  it('rejects requests without an authenticated user', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .post(`/groups/${GROUP_ID}/events`)
      .send(validBody)
      .expect(401);
  });

  it('documents the endpoint responses in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/groups/{groupId}/events'].post;

    expect(Object.keys(operation.responses).sort()).toEqual([
      '201',
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
