import { EventDetailsAccessDeniedError } from '../../../../src/modules/events/application/get-event.use-case';
import {
  GetMemoryUseCase,
  MemoryNotFoundError,
} from '../../../../src/modules/events/application/get-memory.use-case';
import {
  type EventMemoryDetails,
  EventRepository,
} from '../../../../src/modules/events/domain/event.repository';

const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEMORY_ID = '77777777-7777-4777-8777-777777777777';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const memory: EventMemoryDetails = {
  id: MEMORY_ID,
  picture: `events/${EVENT_ID}/memories/${MEMORY_ID}/image.png`,
  eventId: EVENT_ID,
};

describe('GetMemoryUseCase', () => {
  it('returns memory details when the user belongs to the group', async () => {
    const findMemoryById = jest.fn().mockResolvedValue({
      memory,
      userIsMember: true,
    });
    const repository = { findMemoryById } as unknown as EventRepository;
    const useCase = new GetMemoryUseCase(repository);

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).resolves.toBe(memory);
    expect(findMemoryById).toHaveBeenCalledWith(MEMORY_ID, EVENT_ID, USER_ID);
  });

  it('reports a memory that does not exist', async () => {
    const repository = {
      findMemoryById: jest.fn().mockResolvedValue(null),
    } as unknown as EventRepository;
    const useCase = new GetMemoryUseCase(repository);

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      MemoryNotFoundError
    );
  });

  it('denies access when the user does not belong to the event group', async () => {
    const repository = {
      findMemoryById: jest.fn().mockResolvedValue({
        memory,
        userIsMember: false,
      }),
    } as unknown as EventRepository;
    const useCase = new GetMemoryUseCase(repository);

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      EventDetailsAccessDeniedError
    );
  });
});
