import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import {
  EventRepository,
  type CreateEventData,
} from '../../../../src/modules/events/domain/event.repository';
import { InMemoryEventRepository } from '../../../../test/helpers/in-memory-event.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryObjectStorage } from '../../../../test/helpers/in-memory-object.storage';

const DEMO_EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('Consulta um evento em /api/events/:id', async () => {
    const eventData: CreateEventData = {
      id: DEMO_EVENT_ID,
      groupId: '33333333-3333-4333-8333-333333333333',
      ownerId: USER_ID,
      name: 'Jantar de aniversário',
      timeslot: new Date('2026-10-15T20:00:00.000Z'),
      location: {
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      image: 'https://example.com/events/jantar.jpg',
      budgetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: new Date('2026-09-22T18:30:00.000Z'),
    };

    await eventRepository.create(eventData);

    const response = await request(app.getHttpServer())
      .get(`/api/events/${DEMO_EVENT_ID}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: DEMO_EVENT_ID,
      name: 'Jantar de aniversário',
      status: 'pending',
      groupId: '33333333-3333-4333-8333-333333333333',
    });
  });
});
