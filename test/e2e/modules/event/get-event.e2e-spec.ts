import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { EventRepository } from '../../../../src/modules/event/domain/event.repository';
import { InMemoryEventRepository } from 'test/helpers/in-memory-event.repository';

const DEMO_EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('EventController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ get: jest.fn() })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(EventRepository)
      .useClass(InMemoryEventRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Consulta um evento', async () => {
    const event = {
      id: DEMO_EVENT_ID,
      name: 'Jantar de aniversário',
      date: '2026-10-15',
      time: '20:00',
      image: 'https://example.com/events/jantar.jpg',
      budegetStart: '50.00',
      budgetEnd: '120.00',
      status: 'pending',
      groupId: '33333333-3333-4333-8333-333333333333',
      location: {
        id: '44444444-4444-4444-8444-444444444444',
        description: 'Rua dos Andradas, 1234, Porto Alegre',
        manuallyCreated: true,
      },
      proposal: {
        id: '55555555-5555-4555-8555-555555555555',
        owner: {
          id: 'c11111111-1111-4111-8111-111111111111',
          name: 'Ana Beatriz Silva',
          image: 'https://example.com/users/ana.jpg',
        },
        responses: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            answer: 'yes',
            createdAt: '2026-09-22T18:30:00.000Z',
            user: {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'Ana Beatriz Silva',
              image: 'https://example.com/users/ana.jpg',
            },
          },
        ],
        createdAt: '2026-09-22T18:30:00.000Z',
      },
      createdAt: '2026-09-22T18:30:00.000Z',
      updatedAt: '2026-09-23T14:00:00.000Z',
    };

    await request(app.getHttpServer()).get(`/event/${DEMO_EVENT_ID}`).expect(200).expect({
      event: event,
    });
  });
});
