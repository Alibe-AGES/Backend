import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { ProposalResponseController } from '../../../../src/modules/proposals/http/proposal-response.controller';
import { ProposalsModule } from '../../../../src/modules/proposals/proposals.module';
import { ProposalsController } from '../../../../src/modules/proposals/http/proposals.controller';
import { EventRepository } from '../../../../src/modules/events/domain/event.repository';
import { PrismaEventRepository } from '../../../../src/modules/events/persistence/prisma-event.repository';
import { GooglePlacesService } from '../../../../src/infrastructure/api/google-places/google-places.service';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const PROPOSAL_ID = '55555555-5555-4555-8555-555555555555';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

describe('ProposalsModule integration', () => {
  let moduleFixture: TestingModule;

  const prisma = {
    event: { findUnique: jest.fn() },
    proposalResponse: { create: jest.fn() },
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({ imports: [ProposalsModule] })
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

  it('connects controller, use case and Prisma repository to create a response', async () => {
    prisma.event.findUnique.mockResolvedValue({
      proposals: [{ id: PROPOSAL_ID }],
      group: { users: [{ userId: USER_ID }] },
    });
    prisma.proposalResponse.create.mockImplementation(({ data }: { data: object }) =>
      Promise.resolve({ id: '66666666-6666-4666-8666-666666666666', ...data })
    );

    const controller = moduleFixture.get(ProposalResponseController);
    const result = await controller.create(EVENT_ID, { answer: 'yes' }, {
      user: { id: USER_ID },
    } as AuthenticatedRequest);

    expect(prisma.proposalResponse.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ proposalId: PROPOSAL_ID, userId: USER_ID, answer: 'yes' }),
    });
    expect(result).toMatchObject({
      id: '66666666-6666-4666-8666-666666666666',
      proposalId: PROPOSAL_ID,
      userId: USER_ID,
      answer: 'yes',
    });
  });

  it('injects the exported event repository and Google Places into the proposal creation flow', async () => {
    const repository = moduleFixture.get(EventRepository);
    expect(repository).toBeInstanceOf(PrismaEventRepository);
    expect(moduleFixture.get(PlacesProvider, { strict: false })).toBeInstanceOf(
      GooglePlacesService
    );
    const location = {
      id: '44444444-4444-4444-8444-444444444444',
      description: null,
      address: null,
    };
    const membership = jest.spyOn(repository, 'findGroupMembership').mockResolvedValue(true);
    const findLocation = jest.spyOn(repository, 'findCatalogLocation').mockResolvedValue(location);
    const create = jest.spyOn(repository, 'createWithCatalogLocation').mockResolvedValue({
      id: PROPOSAL_ID,
      createdAt: new Date('2026-10-09T17:00:00.000Z'),
      owner: { id: USER_ID, name: 'Ana', image: null },
      event: {
        id: EVENT_ID,
        name: 'Café',
        timeslot: new Date('2026-10-17T15:00:00.000Z'),
        budgetStart: null,
        budgetEnd: null,
        status: 'pending',
        groupId: '33333333-3333-4333-8333-333333333333',
      },
      location,
      myAnswer: 'yes',
    });
    try {
      const result = await moduleFixture
        .get(ProposalsController)
        .create(
          '33333333-3333-4333-8333-333333333333',
          { locationId: PLACE_ID, name: 'Café', date: '2026-10-17', time: '15:00' },
          { user: { id: USER_ID } } as AuthenticatedRequest
        );
      expect(result).toMatchObject({
        id: PROPOSAL_ID,
        owner: { id: USER_ID, image: null },
        event: { date: '2026-10-17', time: '15:00' },
        location,
        myAnswer: 'yes',
      });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: USER_ID,
          location: { externalId: PLACE_ID, description: null, address: null },
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
