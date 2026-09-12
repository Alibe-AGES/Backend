import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { AvailabilityModule } from '../../../../src/modules/availability/availability.module';
import { AvailabilityController } from '../../../../src/modules/availability/http/availability.controller';
import { CreateAvailabilityUseCase } from '../../../../src/modules/availability/application/create-availability.use-case';

const groupId = '8549aded-7ca6-45bf-b96c-a8ddc49c95f0';
const userId = '11111111-1111-4111-8111-111111111111';

describe('AvailabilityModule integration', () => {
  let moduleFixture: TestingModule;

  const rows = new Map<
    string,
    {
      id: string;
      groupId: string;
      userId: string;
      date: Date;
      timeslotStart: Date | null;
      timeslotEnd: Date | null;
    }
  >();

  let idCounter = 1;

  const prisma = {
    group: {
      findUnique: jest.fn(),
    },
    availability: {
      create: jest.fn(
        (input: {
          data: {
            group: { connect: { id: string } };
            user: { connect: { id: string } };
            date: Date;
            timeslotStart?: Date | null;
            timeslotEnd?: Date | null;
          };
        }) => {
          const row = {
            id: `availability-uuid-${idCounter++}`,
            groupId: input.data.group.connect.id,
            userId: input.data.user.connect.id,
            date: input.data.date,
            timeslotStart: input.data.timeslotStart ?? null,
            timeslotEnd: input.data.timeslotEnd ?? null,
          };
          rows.set(row.id, row);
          return Promise.resolve(row);
        }
      ),
    },
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AvailabilityModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(() => {
    rows.clear();
    jest.clearAllMocks();
    prisma.group.findUnique.mockResolvedValue({ users: [{ userId }] });
  });

  it('connects controller, use case and Prisma repository for creation with timeslots', async () => {
    const controller = moduleFixture.get(AvailabilityController);

    const dto = {
      userId,
      date: '2026-10-15',
      startTime: '15:00',
      endTime: '20:00',
    };

    const req = { user: { id: userId } } as any;

    const result = await controller.create(groupId, dto, req);

    expect(result).toEqual({
      id: expect.any(String),
      groupId,
      userId,
      date: '2026-10-15',
      startTime: '15:00',
      endTime: '20:00',
    });

    expect(prisma.availability.create).toHaveBeenCalledWith({
      data: {
        group: { connect: { id: groupId } },
        user: { connect: { id: userId } },
        date: new Date('2026-10-15T00:00:00.000Z'),
        timeslotStart: new Date('2026-10-15T15:00:00.000Z'),
        timeslotEnd: new Date('2026-10-15T20:00:00.000Z'),
      },
    });

    expect(prisma.group.findUnique).toHaveBeenCalledWith({
      where: { id: groupId },
      select: {
        users: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    expect(rows.size).toBe(1);
  });

  it('connects use case and Prisma repository for creation without timeslots', async () => {
    const createAvailabilityUseCase = moduleFixture.get(CreateAvailabilityUseCase);

    const created = await createAvailabilityUseCase.create({
      groupId,
      userId,
      date: '2026-10-15',
    });

    expect(created).toEqual(
      expect.objectContaining({
        groupId,
        userId,
        date: new Date('2026-10-15T00:00:00.000Z'),
        timeslotStart: null,
        timeslotEnd: null,
      })
    );

    expect(prisma.availability.create).toHaveBeenCalledWith({
      data: {
        group: { connect: { id: groupId } },
        user: { connect: { id: userId } },
        date: new Date('2026-10-15T00:00:00.000Z'),
        timeslotStart: null,
        timeslotEnd: null,
      },
    });
  });
});
