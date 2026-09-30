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
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OUTSIDER_ID = '99999999-9999-4999-8999-999999999999';
const RESPONSES_PATH = `/api/events/${EVENT_ID}/proposal/responses`;

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

  it('documents both operations in Swagger', async () => {
    const swagger = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const collection = swagger.body.paths['/api/events/{eventId}/proposal/responses'];
    const own = swagger.body.paths['/api/events/{eventId}/proposal/responses/me'];

    expect(Object.keys(collection.post.responses).sort()).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '409',
    ]);
    expect(Object.keys(own.patch.responses).sort()).toEqual(['200', '400', '401', '403', '404']);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
