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
      .useValue({ findAvailabilitiesByDate })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    findAvailabilitiesByDate.mockReset();
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
          availableAllDay: false,
          intervals: [],
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Bruno Henrique Souza',
          image: null,
          availableAllDay: true,
          intervals: [],
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Camila Oliveira',
          image: null,
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
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
