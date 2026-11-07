import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import {
  EventRepository,
  type CreateEventData,
} from '../../../../src/modules/events/domain/event.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const DEMO_EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DEMO_MEMORY_ID = '77777777-7777-4777-8777-777777777777';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('EventMemoryController (e2e)', () => {
  let app: INestApplication;
  let eventRepository: InMemoryEventRepository;

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
      .overrideProvider(EventRepository)
      .useClass(InMemoryEventRepository)
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication();

    app.use((req: any, _res: any, next: () => void) => {
      req.user = { id: USER_ID };
      next();
    });

    setupApplication(app);
    await app.init();

    eventRepository = moduleFixture.get<InMemoryEventRepository>(EventRepository);

    const eventData: CreateEventData = {
      id: DEMO_EVENT_ID,
      groupId: GROUP_ID,
      ownerId: USER_ID,
      name: 'Jantar de aniversário',
      timeslot: new Date('2026-10-15T20:00:00.000Z'),
      location: {
        kind: 'new',
        id: '44444444-4444-4444-8444-444444444444',
        address: 'Rua dos Andradas, 1234, Porto Alegre',
        image: null,
      },
      image: 'events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/image.png',
      budgetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: new Date('2026-09-22T18:30:00.000Z'),
      notification: {
        type: 'createdEvent',
        message: 'O evento "Jantar de aniversário" foi criado para o dia 15/10/2026.',
        createdAt: new Date('2026-09-22T18:30:00.000Z'),
      },
    };

    await eventRepository.create(eventData);

    eventRepository.setMemory(DEMO_EVENT_ID, {
      id: DEMO_MEMORY_ID,
      eventId: DEMO_EVENT_ID,
      picture: `events/${DEMO_EVENT_ID}/memories/${DEMO_MEMORY_ID}/image`,
    });
  });

  beforeEach(() => {
    eventRepository.setGroupMembers(GROUP_ID, [USER_ID]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the memory details contract at GET /api/events/:eventId/memories/:memoryId', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/events/${DEMO_EVENT_ID}/memories/${DEMO_MEMORY_ID}`)
      .expect(200);

    expect(response.body).toEqual({
      id: DEMO_MEMORY_ID,
      picture: `events/${DEMO_EVENT_ID}/memories/${DEMO_MEMORY_ID}/image`,
      eventId: DEMO_EVENT_ID,
    });
  });

  it('returns 403 when the authenticated user does not belong to the group', async () => {
    eventRepository.setGroupMembers(GROUP_ID, []);

    await request(app.getHttpServer())
      .get(`/api/events/${DEMO_EVENT_ID}/memories/${DEMO_MEMORY_ID}`)
      .expect(403);
  });

  it('returns 404 when the memory does not exist', async () => {
    await request(app.getHttpServer())
      .get(`/api/events/${DEMO_EVENT_ID}/memories/99999999-9999-4999-8999-999999999999`)
      .expect(404);
  });

  it('returns 400 when eventId or memoryId is not a UUID', async () => {
    await request(app.getHttpServer())
      .get(`/api/events/not-a-uuid/memories/${DEMO_MEMORY_ID}`)
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/events/${DEMO_EVENT_ID}/memories/not-a-uuid`)
      .expect(400);
  });
});
