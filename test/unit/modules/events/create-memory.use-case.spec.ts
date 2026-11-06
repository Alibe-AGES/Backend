import {
  CreateMemoryUseCase,
  InvalidMemoryCreationError,
} from '../../../../src/modules/events/application/create-memory.use-case';
import { Event } from '../../../../src/modules/events/domain/event.entity';
import {
  EventDetailsAccessDeniedError,
  GetEventUseCase,
} from '../../../../src/modules/events/application/get-event.use-case';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('CreateMemoryUseCase', () => {
  let events: InMemoryEventRepository;
  let storage: InMemoryObjectStorage;
  let getEventUseCase: GetEventUseCase;
  let useCase: CreateMemoryUseCase;

  beforeEach(() => {
    events = new InMemoryEventRepository();
    storage = new InMemoryObjectStorage();

    events.setGroupMembers(GROUP_ID, [USER_ID]);

    events.set(
      new Event({
        id: EVENT_ID,
        groupId: GROUP_ID,
        name: 'Encontro',
        timeslot: new Date('2026-10-15T20:00:00.000Z'),
        image: null,
        budgetStart: null,
        budgetEnd: null,
        status: 'pending',
        location: { id: 'location-id', description: 'Local', manuallyCreated: true },
        proposals: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    getEventUseCase = new GetEventUseCase(events);
    useCase = new CreateMemoryUseCase(getEventUseCase, events, storage);
  });

  it('successfully creates a memory with an image and stores it', async () => {
    const input = {
      eventId: EVENT_ID,
      image: { originalName: 'memory.png', contentType: 'image/png', bytes: PNG_BYTES },
    };

    const result = await useCase.execute(input, USER_ID);

    expect(result).toMatchObject({
      id: expect.any(String),
      eventId: EVENT_ID,
      picture: expect.stringMatching(/^\/memories\/.+\/images\/.+$/),
    });

    await expect(storage.findByKey(result.picture)).resolves.toEqual({
      bytes: PNG_BYTES,
      contentType: 'image/png',
    });
  });

  it('denies a user who does not belong to the group', async () => {
    const input = {
      eventId: EVENT_ID,
      image: { originalName: 'memory.png', contentType: 'image/png', bytes: PNG_BYTES },
    };

    await expect(useCase.execute(input, OTHER_USER_ID)).rejects.toBeInstanceOf(
      EventDetailsAccessDeniedError
    );
  });

  it.each([
    { originalName: 'memory.png', contentType: 'text/plain', bytes: PNG_BYTES },
    { originalName: 'memory.txt', contentType: 'image/png', bytes: PNG_BYTES },
  ])('rejects an upload with invalid content type or extension', async (image) => {
    const saveSpy = jest.spyOn(storage, 'save');

    await expect(useCase.execute({ eventId: EVENT_ID, image }, USER_ID)).rejects.toBeInstanceOf(
      InvalidMemoryCreationError
    );
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('removes the stored image when database persistence fails', async () => {
    const deleteSpy = jest.spyOn(storage, 'delete');
    jest.spyOn(events, 'createMemory').mockRejectedValue(new Error('database unavailable'));

    const input = {
      eventId: EVENT_ID,
      image: { originalName: 'memory.png', contentType: 'image/png', bytes: PNG_BYTES },
    };

    await expect(useCase.execute(input, USER_ID)).rejects.toThrow('database unavailable');

    const imageKey = deleteSpy.mock.calls[0][0];
    await expect(storage.findByKey(imageKey)).resolves.toBeNull();
  });
});
