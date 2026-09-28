import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { EventsModule } from '../../../../src/modules/events/events.module';
import { EventController } from '../../../../src/modules/events/http/event.controller';
import type { CreateEventDto } from '../../../../src/modules/events/http/dto/create-event.dto';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

const groupId = '33333333-3333-4333-8333-333333333333';
const userId = '11111111-1111-4111-8111-111111111111';

describe('EventsModule integration', () => {
  let moduleFixture: TestingModule;

  const transaction = {
    location: { create: jest.fn() },
    event: { create: jest.fn(), findUniqueOrThrow: jest.fn() },
    proposal: { create: jest.fn() },
    proposalResponse: { create: jest.fn() },
  };
  const prisma = {
    group: { findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({ imports: [EventsModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .compile();
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects controller, use case and Prisma repository to create an event', async () => {
    const createdAt = new Date('2026-09-22T18:30:00.000Z');
    prisma.group.findUnique.mockResolvedValue({ users: [{ userId }] });
    transaction.location.create.mockResolvedValue({ id: 'location-id' });
    transaction.event.create.mockImplementation(({ data }: { data: { id: string } }) =>
      Promise.resolve({ id: data.id })
    );
    transaction.proposal.create.mockResolvedValue({ id: 'proposal-id' });
    transaction.proposalResponse.create.mockResolvedValue({
      id: 'response-id',
      userId,
      answer: 'yes',
    });
    transaction.event.findUniqueOrThrow.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve({
        id: where.id,
        name: 'Jantar',
        timeslot: new Date('2026-10-15T20:00:00.000Z'),
        image: null,
        budgetStart: null,
        budgetEnd: null,
        status: 'pending',
        groupId,
        locationId: 'location-id',
        location: { id: 'location-id', description: 'Casa', manuallyCreated: true },
        proposals: [{ id: 'proposal-id', ownerId: userId }],
        createdAt,
        updatedAt: createdAt,
      })
    );

    const controller = moduleFixture.get(EventController);
    const result = await controller.create(
      groupId,
      { name: 'Jantar', date: '2026-10-15', time: '20:00', location: 'Casa' } as CreateEventDto,
      undefined,
      { user: { id: userId } } as AuthenticatedRequest
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.location.create).toHaveBeenCalledWith({
      data: { description: 'Casa', manuallyCreated: true },
      select: { id: true },
    });
    expect(result).toMatchObject({
      name: 'Jantar',
      status: 'pending',
      location: { id: 'location-id', manuallyCreated: true },
      proposal: {
        id: 'proposal-id',
        ownerId: userId,
        response: { id: 'response-id', userId, answer: 'yes' },
      },
    });
  });
});
