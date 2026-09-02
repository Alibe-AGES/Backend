import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const DEMO_GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('Groups mock endpoints (e2e)', () => {
  let app: INestApplication;

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

  it('lists the mocked groups', async () => {
    const response = await request(app.getHttpServer()).get('/groups').expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        {
          id: DEMO_GROUP_ID,
          name: 'Amigos da faculdade',
          profilePic: 'https://images.example.com/groups/faculdade.jpg',
          createdAt: '2026-08-01T15:00:00.000Z',
        },
      ])
    );
  });

  it('gets the mocked group details, participants and next event', async () => {
    const response = await request(app.getHttpServer()).get(`/groups/${DEMO_GROUP_ID}`).expect(200);

    expect(response.body).toEqual({
      id: DEMO_GROUP_ID,
      name: 'Amigos da faculdade',
      profilePic: 'https://images.example.com/groups/faculdade.jpg',
      createdAt: '2026-08-01T15:00:00.000Z',
      participants: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Ana Souza',
          profilePic: 'https://images.example.com/users/ana.jpg',
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Leonardo Silva',
          profilePic: null,
        },
      ],
      nextEvent: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Jantar da turma',
        timeslot: '2026-09-05T20:00:00.000Z',
        status: 'confirmed',
      },
    });
  });

  it('creates a mocked group from multipart name and profile_pic', async () => {
    const response = await request(app.getHttpServer())
      .post('/groups')
      .field('name', 'Grupo criado no E2E')
      .attach('profile_pic', Buffer.from([137, 80, 78, 71]), {
        filename: 'group.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      name: 'Grupo criado no E2E',
      profilePic: expect.stringMatching(/^https:\/\/images\.example\.com\/groups\//),
      createdAt: expect.any(String),
    });

    await request(app.getHttpServer()).post('/groups').field('name', 'A').expect(400);
  });

  it('gets a valid invite and accesses it without receiving userId', async () => {
    const first = await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/invite-link`)
      .expect(200);
    const current = await request(app.getHttpServer())
      .get(`/groups/${DEMO_GROUP_ID}/invite-link`)
      .expect(200);

    expect(first.body).toEqual({
      token: expect.stringMatching(/^[0-9a-f-]{36}$/),
      expiresAt: expect.any(String),
    });
    expect(current.body.token).toBe(first.body.token);

    await request(app.getHttpServer())
      .post(`/invite-links/${first.body.token}/join`)
      .send({})
      .expect(201)
      .expect({
        token: first.body.token,
      });
  });

  it('validates invite UUIDs and exposes the current endpoints in Swagger', async () => {
    await request(app.getHttpServer()).get('/groups/not-a-uuid').expect(400);
    await request(app.getHttpServer()).get('/groups/not-a-uuid/invite-link').expect(400);
    await request(app.getHttpServer()).post('/invite-links/not-a-uuid/join').expect(400);

    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(swagger.body.paths['/groups'].get).toBeDefined();
    expect(swagger.body.paths['/groups'].post).toBeDefined();
    expect(swagger.body.paths['/groups/{groupId}'].get).toBeDefined();
    expect(swagger.body.paths['/groups/{groupId}/invite-link'].get).toBeDefined();
    expect(swagger.body.paths['/invite-links/{token}/join'].post).toBeDefined();
    expect(
      Object.keys(swagger.body.components.schemas.JoinGroupByInviteResponseDto.properties)
    ).toEqual(['token']);

    const createGroupMultipartProperties =
      swagger.body.paths['/groups'].post.requestBody.content['multipart/form-data'].schema
        .properties;

    expect(createGroupMultipartProperties).toHaveProperty('profile_pic');
    expect(createGroupMultipartProperties).not.toHaveProperty('image');

    expect(Object.keys(swagger.body.paths['/groups'].get.responses).sort()).toEqual(['200', '500']);
    expect(Object.keys(swagger.body.paths['/groups'].post.responses).sort()).toEqual([
      '201',
      '400',
      '500',
    ]);
    expect(Object.keys(swagger.body.paths['/groups/{groupId}'].get.responses).sort()).toEqual([
      '200',
      '400',
      '500',
    ]);
    expect(
      Object.keys(swagger.body.paths['/groups/{groupId}/invite-link'].get.responses).sort()
    ).toEqual(['200', '400', '500']);
    expect(
      Object.keys(swagger.body.paths['/invite-links/{token}/join'].post.responses).sort()
    ).toEqual(['201', '400', '500']);
  });
});
