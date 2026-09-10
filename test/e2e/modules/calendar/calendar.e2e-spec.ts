import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';
import { CalendarRepository } from '../../../../src/modules/calendar/domain/calendar.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const DEMO_GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_USER_ID = '22222222-2222-4222-8222-222222222222';

describe('Calendar endpoint (e2e)', () => {
  let app: INestApplication;
  const findGroupCalendarData = jest.fn();

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
      .overrideProvider(CalendarRepository)
      .useValue({ findGroupCalendarData })
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

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-05-10T12:00:00.000Z').getTime());
    findGroupCalendarData.mockReset();
    findGroupCalendarData.mockResolvedValue({
      userIsMember: true,
      memberIds: [AUTHENTICATED_USER_ID, SECOND_USER_ID],
      events: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          timeslot: new Date('2026-05-08T20:00:00.000Z'),
          status: 'confirmed',
          proposalIds: [],
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          timeslot: new Date('2026-05-22T20:00:00.000Z'),
          status: 'confirmed',
          proposalIds: [],
        },
        {
          id: 'event-proposed',
          timeslot: new Date('2026-05-19T20:00:00.000Z'),
          status: 'pending',
          proposalIds: ['44444444-4444-4444-8444-444444444444'],
        },
      ],
      availabilities: [
        {
          userId: AUTHENTICATED_USER_ID,
          date: new Date('2026-05-18T00:00:00.000Z'),
        },
        {
          userId: SECOND_USER_ID,
          date: new Date('2026-05-18T00:00:00.000Z'),
        },
      ],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns only calendar days that contain information for the requested month', async () => {
    const response = await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 5, year: 2026 })
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2026-05-08',
          completedEventIds: ['33333333-3333-4333-8333-333333333333'],
        }),
        expect.objectContaining({
          date: '2026-05-18',
          availableUserIds: [AUTHENTICATED_USER_ID, SECOND_USER_ID],
          allUsersAvailable: true,
        }),
        expect.objectContaining({
          date: '2026-05-19',
          proposalIds: ['44444444-4444-4444-8444-444444444444'],
        }),
        expect.objectContaining({
          date: '2026-05-22',
          scheduledEventIds: ['55555555-5555-4555-8555-555555555555'],
        }),
      ])
    );
    expect(findGroupCalendarData).toHaveBeenCalledWith({
      groupId: DEMO_GROUP_ID,
      userId: AUTHENTICATED_USER_ID,
      periodStart: new Date('2026-05-01T00:00:00.000Z'),
      periodEnd: new Date('2026-06-01T00:00:00.000Z'),
    });
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

  it('returns 403 when the authenticated user does not belong to the group', async () => {
    findGroupCalendarData.mockResolvedValue({
      userIsMember: false,
      memberIds: [],
      events: [],
      availabilities: [],
    });

    await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 5, year: 2026 })
      .expect(403);
  });

  it('returns 404 when the group does not exist', async () => {
    findGroupCalendarData.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/calendar`)
      .query({ month: 5, year: 2026 })
      .expect(404);
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
    expect(Object.keys(operation.responses).sort()).toEqual([
      '200',
      '400',
      '401',
      '403',
      '404',
      '500',
    ]);
  });
});
