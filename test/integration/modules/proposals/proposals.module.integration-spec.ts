import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { ProposalResponseController } from '../../../../src/modules/proposals/http/proposal-response.controller';
import { ProposalsModule } from '../../../../src/modules/proposals/proposals.module';
import { ProposalsController } from '../../../../src/modules/proposals/http/proposals.controller';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.repository';
import { PrismaProposalRepository } from '../../../../src/modules/proposals/persistence/prisma-proposal.repository';
import { GooglePlacesService } from '../../../../src/infrastructure/api/google-places/google-places.service';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = '44444444-4444-4444-8444-444444444444';
const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const LOCATION_ID = '88888888-8888-4888-8888-888888888888';

describe('ProposalsModule integration', () => {
  let moduleFixture: TestingModule;

  const transaction = {
    $queryRaw: jest.fn(),
    proposal: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    proposalResponse: { create: jest.fn() },
    groupNotification: { create: jest.fn() },
  };
  const prisma = {
    event: { findUnique: jest.fn() },
    proposal: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({ imports: [ProposalsModule, GroupsModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-test-media')
      .compile();
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(() => {
    transaction.proposalResponse.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: '66666666-6666-4666-8666-666666666666', ...data })
    );
    transaction.proposal.findUniqueOrThrow.mockResolvedValue({
      type: 'suggestion',
      name: 'Café',
      matchedAt: null,
      groupId: GROUP_ID,
      locationId: LOCATION_ID,
      group: { users: [{ userId: OWNER_ID }, { userId: USER_ID }] },
      responses: [{ userId: OWNER_ID }, { userId: USER_ID }],
    });
  });

  it('connects controller, use case and Prisma repository to answer an event proposal', async () => {
    prisma.event.findUnique.mockResolvedValue({
      proposals: [{ id: PROPOSAL_ID }],
      group: { users: [{ userId: USER_ID }] },
    });
    transaction.proposal.findUniqueOrThrow.mockResolvedValueOnce({
      type: 'event',
      name: null,
      matchedAt: null,
      groupId: GROUP_ID,
      group: { users: [{ userId: USER_ID }] },
      responses: [{ userId: USER_ID }],
    });

    const controller = moduleFixture.get(ProposalResponseController);
    const result = await controller.create(EVENT_ID, { answer: 'yes' }, {
      user: { id: USER_ID },
    } as AuthenticatedRequest);

    expect(transaction.proposalResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ proposalId: PROPOSAL_ID, userId: USER_ID, answer: 'yes' }),
    });
    expect(result).toMatchObject({
      id: '66666666-6666-4666-8666-666666666666',
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes',
      matched: false,
    });
  });

  it('connects the suggestion route to the match registration', async () => {
    prisma.proposal.findUnique.mockResolvedValue({ group: { users: [{ userId: USER_ID }] } });
    transaction.groupNotification.create.mockClear();

    const result = await moduleFixture
      .get(ProposalResponseController)
      .createForProposal(PROPOSAL_ID, { answer: 'yes' }, {
        user: { id: USER_ID },
      } as AuthenticatedRequest);

    expect(result).toMatchObject({ proposalId: PROPOSAL_ID, answer: 'yes', matched: true });
    expect(transaction.groupNotification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'match', locationId: LOCATION_ID, groupId: GROUP_ID }),
      select: { id: true },
    });
  });

  it('injects the proposal repository and Google Places into the suggestion creation flow', async () => {
    const repository = moduleFixture.get(ProposalRepository);
    expect(repository).toBeInstanceOf(PrismaProposalRepository);
    expect(moduleFixture.get(PlacesProvider, { strict: false })).toBeInstanceOf(
      GooglePlacesService
    );
    const location = {
      id: '44444444-4444-4444-8444-444444444444',
      externalId: PLACE_ID,
      name: 'Café',
      description: null,
      address: null,
      openingHours: [],
      rating: null,
      phoneNumber: null,
      website: null,
      priceRange: { start: null, end: null, currencyCode: null },
      image: null,
      manuallyCreated: false,
    };
    const membership = jest.spyOn(repository, 'findGroupMembership').mockResolvedValue(true);
    const findLocation = jest.spyOn(repository, 'findCatalogLocation').mockResolvedValue(location);
    const create = jest.spyOn(repository, 'createSuggestion').mockResolvedValue({
      id: PROPOSAL_ID,
      type: 'suggestion',
      groupId: GROUP_ID,
      name: 'Café',
      createdAt: new Date('2026-10-09T17:00:00.000Z'),
      owner: { id: USER_ID, name: 'Ana', image: null },
      location,
      myAnswer: 'yes',
      matched: false,
    });
    try {
      const result = await moduleFixture
        .get(ProposalsController)
        .create(GROUP_ID, { externalId: PLACE_ID }, undefined, {
          user: { id: USER_ID },
        } as AuthenticatedRequest);
      expect(result).toMatchObject({
        id: PROPOSAL_ID,
        type: 'suggestion',
        owner: { id: USER_ID, image: null },
        location: {
          id: location.id,
          externalId: location.externalId,
          name: location.name,
          description: location.description,
          address: location.address,
          openingHours: location.openingHours,
          rating: location.rating,
          phoneNumber: location.phoneNumber,
          website: location.website,
          priceRange: location.priceRange,
          imageUrl: null,
          manuallyCreated: location.manuallyCreated,
        },
        myAnswer: 'yes',
        matched: false,
      });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: USER_ID,
          location: { kind: 'existing', id: location.id },
        })
      );
      expect(findLocation).toHaveBeenCalledWith(PLACE_ID);
    } finally {
      membership.mockRestore();
      findLocation.mockRestore();
      create.mockRestore();
    }
  });
});
