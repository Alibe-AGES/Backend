import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ProposalResponseRepository } from '../../../../src/modules/proposals/domain/proposal-response.repository';
import { InMemoryProposalResponseRepository } from '../../../helpers/in-memory-proposal-response.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const SUGGESTION_ID = '77777777-7777-4777-8777-777777777777';
const LOCATION_ID = '88888888-8888-4888-8888-888888888888';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';
const RESPONSES_PATH = `/api/events/${EVENT_ID}/proposal/responses`;
const SUGGESTION_RESPONSES_PATH = `/api/proposals/${SUGGESTION_ID}/responses`;

describe('Proposal responses endpoints (e2e)', () => {
  let app: INestApplication;
  let responses: InMemoryProposalResponseRepository;
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
      .overrideProvider(ProposalResponseRepository)
      .useClass(InMemoryProposalResponseRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    responses = moduleFixture.get(ProposalResponseRepository);
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
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    responses.clear();
    responses.setEvent(EVENT_ID, PROPOSAL_ID, [USER_ID]);
  });

  it('creates the response and then allows the user to edit it', async () => {
    const created = await request(app.getHttpServer())
      .post(RESPONSES_PATH)
      .send({ answer: 'yes' })
      .expect(201);

    expect(created.body).toEqual({
      id: expect.any(String),
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes',
      createdAt: expect.any(String),
      matched: false,
    });

    const updated = await request(app.getHttpServer())
      .patch(`${RESPONSES_PATH}/me`)
      .send({ answer: 'no' })
      .expect(200);

    expect(updated.body).toEqual({ ...created.body, answer: 'no' });
  });

  it('rejects a second response from the same user', async () => {
    await request(app.getHttpServer()).post(RESPONSES_PATH).send({ answer: 'yes' }).expect(201);
    await request(app.getHttpServer()).post(RESPONSES_PATH).send({ answer: 'no' }).expect(409);
  });

  it('rejects answers other than yes or no', async () => {
    await request(app.getHttpServer()).post(RESPONSES_PATH).send({ answer: 'pending' }).expect(400);
    await request(app.getHttpServer())
      .patch(`${RESPONSES_PATH}/me`)
      .send({ answer: 'maybe' })
      .expect(400);
  });

  it('rejects an invalid event id', async () => {
    await request(app.getHttpServer())
      .post('/api/events/not-a-uuid/proposal/responses')
      .send({ answer: 'yes' })
      .expect(400);
  });

  it('returns 404 when editing a response that does not exist', async () => {
    await request(app.getHttpServer())
      .patch(`${RESPONSES_PATH}/me`)
      .send({ answer: 'no' })
      .expect(404);
  });

  it('rejects a user outside the event group', async () => {
    process.env.MOCK_AUTH_USER_ID = OUTSIDER_ID;

    await request(app.getHttpServer()).post(RESPONSES_PATH).send({ answer: 'yes' }).expect(403);
  });

  it('rejects requests without an authenticated user', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer()).post(RESPONSES_PATH).send({ answer: 'yes' }).expect(401);
  });

  describe('suggestion responses', () => {
    beforeEach(async () => {
      responses.setSuggestion(SUGGESTION_ID, [OWNER_ID, USER_ID], LOCATION_ID);
      await responses.create({
        proposalId: SUGGESTION_ID,
        userId: OWNER_ID,
        answer: 'yes',
        createdAt: new Date('2026-10-20T10:00:00.000Z'),
      });
    });

    it('tells the last member who accepts that the suggestion matched', async () => {
      const response = await request(app.getHttpServer())
        .post(SUGGESTION_RESPONSES_PATH)
        .send({ answer: 'yes' })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        proposalId: SUGGESTION_ID,
        userId: USER_ID,
        answer: 'yes',
        createdAt: expect.any(String),
        matched: true,
      });
      expect(responses.matchNotifications).toEqual([
        { locationId: LOCATION_ID, createdAt: expect.any(Date) },
      ]);
    });

    it('stores an acceptance without match while another member has not accepted', async () => {
      responses.setSuggestion(SUGGESTION_ID, [OWNER_ID, USER_ID, OUTSIDER_ID], LOCATION_ID);

      const response = await request(app.getHttpServer())
        .post(SUGGESTION_RESPONSES_PATH)
        .send({ answer: 'yes' })
        .expect(201);

      expect(response.body).toMatchObject({ answer: 'yes', matched: false });
      expect(responses.matchNotifications).toEqual([]);
    });

    it('reports the match when the last refusal is changed to an acceptance', async () => {
      await request(app.getHttpServer())
        .post(SUGGESTION_RESPONSES_PATH)
        .send({ answer: 'no' })
        .expect(201)
        .expect(({ body }) => expect(body.matched).toBe(false));

      const updated = await request(app.getHttpServer())
        .patch(`${SUGGESTION_RESPONSES_PATH}/me`)
        .send({ answer: 'yes' })
        .expect(200);

      expect(updated.body).toMatchObject({ answer: 'yes', matched: true });
    });

    it('returns 404 for an unknown proposal and 403 for a user outside its group', async () => {
      await request(app.getHttpServer())
        .post('/api/proposals/00000000-0000-4000-8000-000000000000/responses')
        .send({ answer: 'yes' })
        .expect(404);

      process.env.MOCK_AUTH_USER_ID = OUTSIDER_ID;
      await request(app.getHttpServer())
        .post(SUGGESTION_RESPONSES_PATH)
        .send({ answer: 'yes' })
        .expect(403);
    });

    it('rejects an invalid proposal id', async () => {
      await request(app.getHttpServer())
        .post('/api/proposals/not-a-uuid/responses')
        .send({ answer: 'yes' })
        .expect(400);
    });
  });

  it('documents the event and suggestion operations in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);

    for (const base of [
      '/api/events/{eventId}/proposal/responses',
      '/api/proposals/{proposalId}/responses',
    ]) {
      expect(Object.keys(swagger.body.paths[base].post.responses).sort()).toEqual([
        '201',
        '400',
        '401',
        '403',
        '404',
        '409',
      ]);
      expect(Object.keys(swagger.body.paths[`${base}/me`].patch.responses).sort()).toEqual([
        '200',
        '400',
        '401',
        '403',
        '404',
      ]);
      for (const operation of [
        swagger.body.paths[base].post,
        swagger.body.paths[`${base}/me`].patch,
      ]) {
        expect(operation.security).toEqual(
          expect.arrayContaining([{ 'better-auth': [] }, { 'better-auth-bearer': [] }])
        );
      }
    }
    expect(swagger.body.components.schemas.ProposalResponseDto.required).toContain('matched');
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
