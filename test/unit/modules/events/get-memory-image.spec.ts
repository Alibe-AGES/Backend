import { EventImageAccessDeniedError } from '../../../../src/modules/events/application/get-event-image.use-case';
import {
  GetMemoryImageUseCase,
  MemoryImageNotFoundError,
} from '../../../../src/modules/events/application/get-memory-image.use-case';
import { EventRepository } from '../../../../src/modules/events/domain/event.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const MEMORY_ID = '11111111-1111-4111-8111-222222222222';
const IMAGE_KEY = `events/${EVENT_ID}/images/event.png`;

describe('GetMemoryImageUseCase', () => {
  let events: jest.Mocked<EventRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let useCase: GetMemoryImageUseCase;

  beforeEach(() => {
    events = {
      findMemoryImageAccess: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;
    storage = {
      save: jest.fn(),
      findByKey: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new GetMemoryImageUseCase(events, storage);
  });

  it('returns the image when the authenticated user belongs to the event group', async () => {
    const image = {
      bytes: Uint8Array.from([137, 80, 78, 71]),
      contentType: 'image/png',
    };
    events.findMemoryImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: true });
    storage.findByKey.mockResolvedValue(image);

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).resolves.toEqual(image);
    expect(events.findMemoryImageAccess).toHaveBeenCalledWith(EVENT_ID, MEMORY_ID, USER_ID);
    expect(storage.findByKey).toHaveBeenCalledWith(IMAGE_KEY);
  });

  it('throws EventImageAccessDeniedError when user is not a member', async () => {
    events.findMemoryImageAccess.mockResolvedValue({
      imageKey: 'some-key',
      userIsMember: false,
    });

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      EventImageAccessDeniedError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('throws MemoryImageNotFoundError when image key is missing', async () => {
    events.findMemoryImageAccess.mockResolvedValue({
      imageKey: '',
      userIsMember: true,
    });

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      MemoryImageNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('denies a user who does not belong to the event group', async () => {
    events.findMemoryImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: false });

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      EventImageAccessDeniedError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an event without an image', async () => {
    events.findMemoryImageAccess.mockResolvedValue({ imageKey: null, userIsMember: true });

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      MemoryImageNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an image missing from storage', async () => {
    events.findMemoryImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: true });
    storage.findByKey.mockResolvedValue(null);

    await expect(useCase.execute(EVENT_ID, MEMORY_ID, USER_ID)).rejects.toBeInstanceOf(
      MemoryImageNotFoundError
    );
  });
});
