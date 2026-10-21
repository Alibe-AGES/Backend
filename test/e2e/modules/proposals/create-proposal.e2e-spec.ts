import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.repository';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';
import { InMemoryProposalRepository } from '../../../helpers/in-memory-proposal.repository';
import { buildPlace } from '../../../helpers/place.fixture';

const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '22222222-2222-4222-8222-222222222222';
const LOCATION_ID = '44444444-4444-4444-8444-444444444444';
const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const UNKNOWN_ID = '77777777-7777-4777-8777-777777777777';
const PATH = `/api/groups/${GROUP_ID}/proposals`;
const body = {
  externalId: PLACE_ID,
};
const storedLocation = (overrides: Record<string, unknown> = {}) => ({
  id: LOCATION_ID,
  externalId: PLACE_ID,
  name: 'Bloom Café',
  description: 'Café tranquilo',
  address: 'Rua Padre Chagas, 320',
  openingHours: [],
  rating: null,
  phoneNumber: null,
  website: null,
  priceRange: { start: null, end: null, currencyCode: null },
  image: null,
  manuallyCreated: false,
  ...overrides,
});

describe('Create proposal endpoint (e2e)', () => {
  let app: INestApplication;
  let proposals: InMemoryProposalRepository;
  const getPlaceById = jest.fn();
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
      .overrideProvider(PlacesProvider)
      .useValue({ getPlaceById })
      .compile();
    proposals = fixture.get(ProposalRepository) as InMemoryProposalRepository;
    app = fixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = USER_ID;
    proposals.setGroupMembers(GROUP_ID, [USER_ID, MEMBER_ID]);
    proposals.setCatalogLocation(PLACE_ID, storedLocation());
    getPlaceById.mockReset().mockResolvedValue(null);
  });

  afterAll(async () => {
    if (previousEnabled === undefined) delete process.env.MOCK_AUTH_ENABLED;
    else process.env.MOCK_AUTH_ENABLED = previousEnabled;
    if (previousUser === undefined) delete process.env.MOCK_AUTH_USER_ID;
    else process.env.MOCK_AUTH_USER_ID = previousUser;
    await app.close();
  });

  it('creates only the suggestion at the exact route with the session owner', async () => {
    const response = await request(app.getHttpServer()).post(PATH).send(body).expect(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      type: 'suggestion',
      groupId: GROUP_ID,
      name: 'Bloom Café',
      createdAt: expect.any(String),
      owner: { id: USER_ID, name: 'Ana Beatriz Silva', image: `/users/${USER_ID}/profile-picture` },
      location: {
        id: LOCATION_ID,
        externalId: PLACE_ID,
        name: 'Bloom Café',
        description: 'Café tranquilo',
        address: 'Rua Padre Chagas, 320',
        openingHours: [],
        rating: null,
        phoneNumber: null,
        website: null,
        priceRange: { start: null, end: null, currencyCode: null },
        imageUrl: null,
        manuallyCreated: false,
      },
      myAnswer: 'yes',
      matched: false,
    });
    expect(new Date(response.body.createdAt).toISOString()).toBe(response.body.createdAt);
    expect(proposals.suggestions.get(response.body.id)).toMatchObject({
      owner: { id: USER_ID },
      location: { id: LOCATION_ID },
    });
    const publicLocation = Object.fromEntries(
      Object.entries(response.body.location).filter(([key]) => key !== 'imageUrl')
    );
    expect(await proposals.findCatalogLocation(PLACE_ID)).toEqual({
      ...publicLocation,
      image: null,
    });
    expect(getPlaceById).not.toHaveBeenCalled();
  });

  it('returns a proposal by id to a member of its group', async () => {
    const created = await request(app.getHttpServer()).post(PATH).send(body).expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/proposals/${created.body.id}`)
      .expect(200);

    expect(response.body).toEqual({
      id: created.body.id,
      type: 'suggestion',
      groupId: GROUP_ID,
      eventId: null,
      name: 'Bloom Café',
      createdAt: created.body.createdAt,
      matchedAt: null,
      matched: false,
      owner: created.body.owner,
      location: created.body.location,
      myAnswer: 'yes',
    });
  });

  it('protects proposal details by id', async () => {
    await request(app.getHttpServer()).get('/api/proposals/not-a-uuid').expect(400);
    await request(app.getHttpServer()).get(`/api/proposals/${UNKNOWN_ID}`).expect(404);

    const created = await request(app.getHttpServer()).post(PATH).send(body).expect(201);
    process.env.MOCK_AUTH_USER_ID = UNKNOWN_ID;
    await request(app.getHttpServer()).get(`/api/proposals/${created.body.id}`).expect(403);
  });

  it('reports the match right away when the owner is the only group member', async () => {
    proposals.setGroupMembers(GROUP_ID, [USER_ID]);

    const response = await request(app.getHttpServer()).post(PATH).send(body).expect(201);

    expect(response.body.matched).toBe(true);
  });

  it.each([
    { date: '2026-10-17' },
    { time: '15:00' },
    { budgetStart: '30.00' },
    { budgetEnd: '60.00' },
  ])('rejects %p because day, time and budget belong to the event', async (field) => {
    const create = jest.spyOn(proposals, 'createSuggestion');
    try {
      await request(app.getHttpServer())
        .post(PATH)
        .send({ ...body, ...field })
        .expect(400);
      expect(create).not.toHaveBeenCalled();
    } finally {
      create.mockRestore();
    }
  });

  it('stores a place used for the first time with the data from Google Places', async () => {
    const newPlaceId = 'ChIJ-new-place';
    getPlaceById.mockResolvedValue(
      buildPlace({ externalId: newPlaceId, summary: 'Bar novo', address: 'Rua Nova, 10' })
    );

    const response = await request(app.getHttpServer())
      .post(PATH)
      .send({ ...body, externalId: newPlaceId })
      .expect(201);

    expect(getPlaceById).toHaveBeenCalledWith(newPlaceId, { includePriceRange: true });
    expect(response.body.location).toMatchObject({
      id: expect.any(String),
      externalId: newPlaceId,
      description: 'Bar novo',
      address: 'Rua Nova, 10',
      manuallyCreated: false,
    });
    const publicLocation = Object.fromEntries(
      Object.entries(response.body.location).filter(([key]) => key !== 'imageUrl')
    );
    expect(await proposals.findCatalogLocation(newPlaceId)).toEqual({
      ...publicLocation,
      image: null,
    });
  });

  it('preserves null location fields', async () => {
    proposals.setCatalogLocation(PLACE_ID, storedLocation({ description: null, address: null }));
    const response = await request(app.getHttpServer()).post(PATH).send(body).expect(201);
    expect(response.body.location).toMatchObject({
      id: LOCATION_ID,
      description: null,
      address: null,
    });
  });

  it('creates a manual suggestion when all location fields are omitted', async () => {
    const response = await request(app.getHttpServer()).post(PATH).send({}).expect(201);
    expect(response.body).toMatchObject({
      name: null,
      location: {
        externalId: null,
        name: null,
        description: null,
        address: null,
        imageUrl: null,
        manuallyCreated: true,
      },
    });
  });

  it.each([
    { name: null },
    { name: '' },
    { name: '   ' },
    { externalId: 'places/../bad id' },
    { ownerId: USER_ID },
    { userId: USER_ID },
    { extra: true },
  ])('rejects invalid or extra fields %p', async (invalid) => {
    await request(app.getHttpServer())
      .post(PATH)
      .send({ ...body, ...invalid })
      .expect(400);
  });

  it('rejects an invalid group UUID', async () => {
    await request(app.getHttpServer())
      .post('/api/groups/bad-uuid/proposals')
      .send(body)
      .expect(400);
  });

  it('returns 404 for an unknown group', async () => {
    await request(app.getHttpServer())
      .post(`/api/groups/${UNKNOWN_ID}/proposals`)
      .send(body)
      .expect(404);
  });

  it('returns 403 for a user outside the group', async () => {
    process.env.MOCK_AUTH_USER_ID = UNKNOWN_ID;
    await request(app.getHttpServer()).post(PATH).send(body).expect(403);
  });

  it('returns 404 for a place unknown to Google Places', async () => {
    await request(app.getHttpServer())
      .post(PATH)
      .send({ ...body, externalId: 'ChIJ-unknown' })
      .expect(404);
    expect(getPlaceById).toHaveBeenCalledWith('ChIJ-unknown', { includePriceRange: true });
  });

  it('returns 401 without an authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';
    await request(app.getHttpServer()).post(PATH).send(body).expect(401);
  });

  it('documents the route, required fields and HTTP responses in Swagger', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);
    const operation = response.body.paths['/api/groups/{groupId}/proposals'].post;
    expect(Object.keys(operation.responses).sort()).toEqual([
      '201',
      '400',
      '401',
      '403',
      '404',
      '413',
      '503',
    ]);
    const schema = operation.requestBody.content['application/json'].schema;
    expect(schema.required).toBeUndefined();
    expect(Object.keys(schema.properties)).toEqual(
      expect.arrayContaining(['name', 'locationId', 'externalId', 'address', 'image'])
    );
  });
});
