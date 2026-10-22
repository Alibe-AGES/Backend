import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const DATE = '2026-09-05';

const findAvailabilitiesByDate = jest.fn();
const findMembership = jest.fn();

describe('Group availabilities endpoint (e2e)', () => {
  let app: INestApplication;
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
      .overrideProvider(GroupRepository)
      .useValue({ findAvailabilitiesByDate, findMembership })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    findAvailabilitiesByDate.mockReset();
    findMembership.mockReset().mockResolvedValue(true);
    findAvailabilitiesByDate.mockResolvedValue({
      date: DATE,
      users: [
        {
          id: USER_ID,
          name: 'Ana Beatriz Silva',
          profilePic: 'users/ana/profile-picture.png',
          availableAllDay: false,
          intervals: [],
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Bruno Henrique Souza',
          profilePic: null,
          availableAllDay: true,
          intervals: [],
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Camila Oliveira',
          profilePic: null,
          availableAllDay: false,
          intervals: [['14:00', '20:00']],
        },
      ],
    });
  });

  afterAll(async () => {
    restoreEnvironment('MOCK_AUTH_ENABLED', previousMockAuthEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousMockAuthUserId);
    await app.close();
  });

  it('returns unavailable, full-day and interval availability', async () => {
    const response = await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/availabilities`)
      .query({ date: DATE })
      .expect(200);

    expect(response.body).toEqual({
      date: DATE,
      users: [
        {
          id: USER_ID,
          name: 'Ana Beatriz Silva',
          image: `/users/${USER_ID}/profile-picture`,
          isCurrentUser: true,
          availableAllDay: false,
          intervals: [],
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Bruno Henrique Souza',
          image: null,
          isCurrentUser: false,
          availableAllDay: true,
          intervals: [],
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Camila Oliveira',
          image: null,
          isCurrentUser: false,
          availableAllDay: false,
          intervals: [['14:00', '20:00']],
        },
      ],
    });
    expect(findAvailabilitiesByDate).toHaveBeenCalledWith(GROUP_ID, DATE, USER_ID);
  });

  it('publishes the nested user schema in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = swagger.body.paths['/groups/{groupId}/availabilities'].get;
    const responseSchema = swagger.body.components.schemas.AvailabilitiesResponseDto;
    const userSchema = swagger.body.components.schemas.GetAvailabilityUserResponseDto;

    expect(operation).toBeDefined();
    expect(Object.keys(operation.responses)).toEqual(
      expect.arrayContaining(['200', '400', '401', '403', '404'])
    );
    expect(operation.parameters.find((parameter) => parameter.name === 'date')).toMatchObject({
      required: true,
      schema: { type: 'string', format: 'date' },
    });
    expect(userSchema.required).toContain('isCurrentUser');
    expect(responseSchema.properties.users.items).toEqual({
      $ref: '#/components/schemas/GetAvailabilityUserResponseDto',
    });
    expect(userSchema.properties.image.nullable).toBe(true);
    expect(userSchema.properties.intervals.items.type).toBe('array');
  });

  it('rejects impossible calendar dates', async () => {
    await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/availabilities`)
      .query({ date: '2026-02-31' })
      .expect(400);

    expect(findAvailabilitiesByDate).not.toHaveBeenCalled();
  });

  it.each([
    '',
    '?date=',
    '?date=2026/09/05',
    '?date=2025-02-29',
    `?date=${DATE}&date=${DATE}`,
    `?date[]=${DATE}`,
    `?date[value]=${DATE}`,
    `?date=${DATE}&date[]=${DATE}`,
    `?date=${DATE}&date[value]=${DATE}`,
  ])('rejects missing, repeated or structured dates: %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/availabilities${query}`)
      .expect(400);
    expect(findMembership).not.toHaveBeenCalled();
    expect(findAvailabilitiesByDate).not.toHaveBeenCalled();
  });

  it('rejects an invalid group UUID', async () => {
    await request(app.getHttpServer())
      .get(`/groups/invalid/availabilities?date=${DATE}`)
      .expect(400);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it.each([
    [null, 404],
    [false, 403],
  ])('returns %s membership as HTTP %s', async (membership, status) => {
    findMembership.mockResolvedValue(membership);
    await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/availabilities?date=${DATE}`)
      .expect(status);
    expect(findAvailabilitiesByDate).not.toHaveBeenCalled();
  });

  it('requires an authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';
    await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/availabilities?date=${DATE}`)
      .expect(401);
    expect(findMembership).not.toHaveBeenCalled();
  });

  it.each([1, 2])('puts the current user first from index %s for a past date', async (index) => {
    const data = await findAvailabilitiesByDate();
    findAvailabilitiesByDate.mockClear();
    const current = data.users.shift();
    data.users.splice(index, 0, current);
    data.date = '2000-02-29';
    findAvailabilitiesByDate.mockResolvedValue(data);
    const response = await request(app.getHttpServer())
      .get(`/groups/${GROUP_ID}/availabilities?date=2000-02-29`)
      .expect(200);
    expect(response.body.date).toBe('2000-02-29');
    expect(response.body.users.map((user) => user.id)).toEqual([
      USER_ID,
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
    ]);
    expect(response.body.users.map((user) => user.isCurrentUser)).toEqual([true, false, false]);
    expect(response.body.users[0]).toMatchObject({ availableAllDay: false, intervals: [] });
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
