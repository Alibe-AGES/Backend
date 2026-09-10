import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaAvailabilityRepository } from '../../../../src/modules/availability/persistence/prisma-availability.repository';

const userId = '11111111-1111-4111-8111-111111111111';
const groupId = '8549aded-7ca6-45bf-b96c-a8ddc49c95f0';

describe('PrismaAvailabilityRepository', () => {
  const create = jest.fn();
  const prisma = {
    availability: { create },
  } as unknown as PrismaService;
  const repository = new PrismaAvailabilityRepository(prisma);

  beforeEach(() => {
    create.mockReset();
  });

  it('creates and maps an availability with all fields provided', async () => {
    const inputData = {
      groupId: groupId,
      userId: userId,
      date: new Date('2026-10-15T00:00:00.000Z'),
      timeslotStart: new Date('2026-10-15T15:00:00.000Z'),
      timeslotEnd: new Date('2026-10-15T20:00:00.000Z'),
    };

    const id = randomUUID();

    const prismaCreatedRow = {
      id: id,
      groupId: inputData.groupId,
      userId: inputData.userId,
      date: inputData.date,
      timeslotStart: inputData.timeslotStart,
      timeslotEnd: inputData.timeslotEnd,
    };

    create.mockResolvedValue(prismaCreatedRow);

    const result = await repository.create(inputData);

    expect(create).toHaveBeenCalledWith({
      data: {
        group: { connect: { id: inputData.groupId } },
        user: { connect: { id: inputData.userId } },
        date: inputData.date,
        timeslotStart: inputData.timeslotStart,
        timeslotEnd: inputData.timeslotEnd,
      },
    });

    expect(result).toEqual(expect.objectContaining(prismaCreatedRow));
  });

  it('creates and maps an availability when timeslotStart and timeslotEnd are not provided', async () => {
    const inputData = {
      groupId: groupId,
      userId: userId,
      date: new Date('2026-10-15T00:00:00.000Z'),
    };

    const id = randomUUID();

    const prismaCreatedRow = {
      id: id,
      groupId: inputData.groupId,
      userId: inputData.userId,
      date: inputData.date,
      timeslotStart: null,
      timeslotEnd: null,
    };

    create.mockResolvedValue(prismaCreatedRow);

    const result = await repository.create(inputData);

    expect(create).toHaveBeenCalledWith({
      data: {
        group: { connect: { id: inputData.groupId } },
        user: { connect: { id: inputData.userId } },
        date: inputData.date,
        timeslotStart: null,
        timeslotEnd: null,
      },
    });

    expect(result).toEqual(expect.objectContaining(prismaCreatedRow));
  });
});
