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
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('EventController (e2e)', () => {
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
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      image: 'events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/image.png',
      budgetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: new Date('2026-09-22T18:30:00.000Z'),
    };

    await eventRepository.create(eventData);
  });

  beforeEach(() => {
    eventRepository.setGroupMembers(GROUP_ID, [USER_ID]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the complete event contract at GET /api/events/:eventId', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/events/${DEMO_EVENT_ID}`)
      .expect(200);

    expect(response.body).toEqual({
      id: DEMO_EVENT_ID,
      name: 'Jantar de aniversário',
      date: '2026-10-15',
      time: '20:00',
      image: `/api/events/${DEMO_EVENT_ID}/image`,
      budgetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      groupId: GROUP_ID,
      location: {
        id: '44444444-4444-4444-8444-444444444444',
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      proposal: {
        id: '55555555-5555-4555-8555-555555555555',
        owner: {
          id: USER_ID,
          name: 'Ana Beatriz Silva',
          image: `/users/${USER_ID}/profile-picture`,
        },
        responses: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            answer: 'yes',
            createdAt: '2026-09-22T18:30:00.000Z',
            user: {
              id: USER_ID,
              name: 'Ana Beatriz Silva',
              image: `/users/${USER_ID}/profile-picture`,
            },
          },
        ],
        createdAt: '2026-09-22T18:30:00.000Z',
      },
      createdAt: '2026-09-22T18:30:00.000Z',
      updatedAt: '2026-09-22T18:30:00.000Z',
    });
  });

  it('returns 403 when the authenticated user does not belong to the group', async () => {
    eventRepository.setGroupMembers(GROUP_ID, []);

    await request(app.getHttpServer()).get(`/api/events/${DEMO_EVENT_ID}`).expect(403);
  });

  it('returns 404 when the event does not exist', async () => {
    await request(app.getHttpServer())
      .get('/api/events/99999999-9999-4999-8999-999999999999')
      .expect(404);
  });

  it('returns 400 when eventId is not a UUID', async () => {
    await request(app.getHttpServer()).get('/api/events/not-a-uuid').expect(400);
  });
});
