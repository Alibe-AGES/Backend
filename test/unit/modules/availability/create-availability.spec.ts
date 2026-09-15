import {
  AvailabilityAccessDeniedError,
  AvailabilityGroupNotFoundError,
  CreateAvailabilityUseCase,
  InvalidAvailabilityError,
} from '../../../../src/modules/availability/application/create-availability.use-case';
import { InMemoryAvailabilityRepository } from '../../../../test/helpers/in-memory-availability.repository';

const userId = '11111111-1111-4111-8111-111111111111';
const groupId = '8549aded-7ca6-45bf-b96c-a8ddc49c95f0';

describe('CreateAvailabilityUseCase', () => {
  let availabilities: InMemoryAvailabilityRepository;
  let useCase: CreateAvailabilityUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T12:00:00.000Z'));
    availabilities = new InMemoryAvailabilityRepository();
    useCase = new CreateAvailabilityUseCase(availabilities);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers a single interval', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
      intervals: [{ timeslotStart: '15:00', timeslotEnd: '20:00' }],
    };

    const result = await useCase.create(input);

    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe(groupId);
    expect(result[0].userId).toBe(userId);
    expect(result[0].date).toEqual(new Date('2026-10-15T00:00:00.000Z'));
    expect(result[0].timeslotStart).toEqual(new Date('2026-10-15T15:00:00.000Z'));
    expect(result[0].timeslotEnd).toEqual(new Date('2026-10-15T20:00:00.000Z'));
  });

  it('registers multiple intervals for the same day', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
      intervals: [
        { timeslotStart: '09:00', timeslotEnd: '12:00' },
        { timeslotStart: '15:00', timeslotEnd: '20:00' },
      ],
    };

    const result = await useCase.create(input);

    expect(result).toHaveLength(2);
    expect(result[0].timeslotStart).toEqual(new Date('2026-10-15T09:00:00.000Z'));
    expect(result[0].timeslotEnd).toEqual(new Date('2026-10-15T12:00:00.000Z'));
    expect(result[1].timeslotStart).toEqual(new Date('2026-10-15T15:00:00.000Z'));
    expect(result[1].timeslotEnd).toEqual(new Date('2026-10-15T20:00:00.000Z'));
  });

  it('registers full-day availability when intervals is not provided', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
    };

    const result = await useCase.create(input);

    expect(result).toHaveLength(1);
    expect(result[0].date).toEqual(new Date('2026-10-15T00:00:00.000Z'));
    expect(result[0].timeslotStart).toBeNull();
    expect(result[0].timeslotEnd).toBeNull();
  });

  it('registers full-day availability when intervals is an empty array', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
      intervals: [],
    };

    const result = await useCase.create(input);

    expect(result).toHaveLength(1);
    expect(result[0].timeslotStart).toBeNull();
    expect(result[0].timeslotEnd).toBeNull();
  });

  it('rejects an inverted time interval', async () => {
    await expect(
      useCase.create({
        groupId,
        userId,
        date: '2026-10-15',
        intervals: [{ timeslotStart: '20:00', timeslotEnd: '15:00' }],
      })
    ).rejects.toThrow(InvalidAvailabilityError);
  });

  it('rejects availability for a past date', async () => {
    await expect(
      useCase.create({
        groupId,
        userId,
        date: '2026-09-13',
      })
    ).rejects.toThrow(InvalidAvailabilityError);
  });

  it('rejects the whole batch when any interval is inverted', async () => {
    await expect(
      useCase.create({
        groupId,
        userId,
        date: '2026-10-15',
        intervals: [
          { timeslotStart: '09:00', timeslotEnd: '12:00' },
          { timeslotStart: '20:00', timeslotEnd: '15:00' },
        ],
      })
    ).rejects.toThrow(InvalidAvailabilityError);
  });

  it('reports a group that does not exist', async () => {
    availabilities.setMembershipResult(null);

    await expect(useCase.create({ groupId, userId, date: '2026-10-15' })).rejects.toThrow(
      AvailabilityGroupNotFoundError
    );
  });

  it('denies creation when the user does not belong to the group', async () => {
    availabilities.setMembershipResult(false);

    await expect(useCase.create({ groupId, userId, date: '2026-10-15' })).rejects.toThrow(
      AvailabilityAccessDeniedError
    );
  });
});
