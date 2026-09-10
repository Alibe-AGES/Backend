import {
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
    availabilities = new InMemoryAvailabilityRepository();
    useCase = new CreateAvailabilityUseCase(availabilities);
  });

  it('should successfully register the availability', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
      timeslotStart: '15:00',
      timeslotEnd: '20:00',
    };

    const result = await useCase.create(input);

    expect(result).toBeDefined();
    expect(result.groupId).toBe(groupId);
    expect(result.userId).toBe(userId);
    expect(result.date).toEqual(new Date('2026-10-15T00:00:00.000Z'));
    expect(result.timeslotStart).toEqual(new Date('2026-10-15T15:00:00.000Z'));
    expect(result.timeslotEnd).toEqual(new Date('2026-10-15T20:00:00.000Z'));
  });

  it('should successfullyregister availability without timeslotStart and timeslotEnd', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
    };

    const result = await useCase.create(input);

    expect(result).toBeDefined();
    expect(result.date).toEqual(new Date('2026-10-15T00:00:00.000Z'));
    expect(result.timeslotStart).toBeNull();
    expect(result.timeslotEnd).toBeNull();
  });

  it('should throw InvalidAvailabilityError if only timeslotStart is fulfill', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
      timeslotStart: '15:00',
    };

    await expect(useCase.create(input)).rejects.toThrow(InvalidAvailabilityError);
    await expect(useCase.create(input)).rejects.toThrow(
      'startTime e endTime devem estar ambos preenchidos ou nenhum'
    );
  });

  it('should throw InvalidAvailabilityError if only timeslotEnd is fulfill', async () => {
    const input = {
      groupId,
      userId,
      date: '2026-10-15',
      timeslotEnd: '20:00',
    };

    await expect(useCase.create(input)).rejects.toThrow(InvalidAvailabilityError);
    await expect(useCase.create(input)).rejects.toThrow(
      'startTime e endTime devem estar ambos preenchidos ou nenhum'
    );
  });
});
