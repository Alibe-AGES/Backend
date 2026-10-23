import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import {
  type ActiveSuggestion,
  ProposalRepository,
} from '../../../../src/modules/proposals/domain/proposal.repository';
import { InMemoryProposalRepository } from '../../../helpers/in-memory-proposal.repository';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const UNKNOWN_ID = '77777777-7777-4777-8777-777777777777';
const PATH = `/api/groups/${GROUP_ID}/proposals`;

const location = {
  id: '88888888-8888-4888-8888-888888888888',
  externalId: null,
  name: 'Restaurante Penne',
  description: 'Restaurante italiano',
  address: 'Rua Mariante, 154',
  openingHours: [],
  rating: null,
  phoneNumber: null,
  website: null,
  priceRange: { start: null, end: null, currencyCode: null },
  image: null,
  manuallyCreated: true,
};

const newestSuggestion: ActiveSuggestion = {
  id: '55555555-5555-4555-8555-555555555555',
  type: 'suggestion',
  groupId: GROUP_ID,
  name: 'Restaurante Penne',
  suggestionDate: new Date('2026-10-12T00:00:00.000Z'),
  createdAt: new Date('2026-10-12T12:00:00.000Z'),
  owner: { id: OWNER_ID, name: 'Daniel Martins', image: 'users/daniel.jpg' },
  location,
  responses: { yes: 1, no: 1, pending: 0 },
};

const olderSuggestion: ActiveSuggestion = {
  ...newestSuggestion,
  id: '66666666-6666-4666-8666-666666666666',
  name: null,
  suggestionDate: new Date('2026-10-10T00:00:00.000Z'),
  createdAt: new Date('2026-10-10T12:00:00.000Z'),
  owner: { id: OWNER_ID, name: 'Daniel Martins', image: null },
  location: null,
  responses: { yes: 1, no: 0, pending: 0 },
};

describe('List active proposals endpoint (e2e)', () => {
  let app: INestApplication;
  let proposals: InMemoryProposalRepository;
  const previousEnabled = process.env.MOCK_AUTH_ENABLED;
  const previousUser = process.env.MOCK_AUTH_USER_ID;

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-test-media')
      .overrideProvider(ProposalRepository)
      .useClass(InMemoryProposalRepository)
      .compile();
    proposals = fixture.get(ProposalRepository) as InMemoryProposalRepository;
    app = fixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    proposals.setGroupMembers(GROUP_ID, [USER_ID, OWNER_ID, MEMBER_ID]);
    proposals.setActiveSuggestions(GROUP_ID, [newestSuggestion, olderSuggestion]);
  });

  afterAll(async () => {
    if (previousEnabled === undefined) delete process.env.MOCK_AUTH_ENABLED;
    else process.env.MOCK_AUTH_ENABLED = previousEnabled;
    if (previousUser === undefined) delete process.env.MOCK_AUTH_USER_ID;
    else process.env.MOCK_AUTH_USER_ID = previousUser;
    await app.close();
  });

  it('lists the suggestions the user still has to answer, in the order returned by the repository', async () => {
    const response = await request(app.getHttpServer()).get(PATH).expect(200);

    expect(response.body).toEqual([
      {
        id: newestSuggestion.id,
        type: 'suggestion',
        groupId: GROUP_ID,
        name: 'Restaurante Penne',
        date: '2026-10-12',
        createdAt: '2026-10-12T12:00:00.000Z',
        owner: {
          id: OWNER_ID,
          name: 'Daniel Martins',
          image: `/users/${OWNER_ID}/profile-picture`,
        },
        location: expect.objectContaining({ id: location.id, imageUrl: null }),
        responses: { yes: 1, no: 1, pending: 0 },
      },
      expect.objectContaining({
        id: olderSuggestion.id,
        name: null,
        date: '2026-10-10',
        owner: { id: OWNER_ID, name: 'Daniel Martins', image: null },
        location: null,
      }),
    ]);
  });

  it('returns an empty list when the group has no active proposals', async () => {
    proposals.setActiveSuggestions(GROUP_ID, []);

    await request(app.getHttpServer()).get(PATH).expect(200).expect([]);
  });

  it('validates the group id and protects the group proposals', async () => {
    await request(app.getHttpServer()).get('/api/groups/not-a-uuid/proposals').expect(400);
    await request(app.getHttpServer()).get(`/api/groups/${UNKNOWN_ID}/proposals`).expect(404);

    process.env.MOCK_AUTH_USER_ID = UNKNOWN_ID;
    await request(app.getHttpServer()).get(PATH).expect(403);

    process.env.MOCK_AUTH_ENABLED = 'false';
    await request(app.getHttpServer()).get(PATH).expect(401);
  });
});
