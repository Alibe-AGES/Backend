import {
  EventForImageNotFoundError,
  EventImageAccessDeniedError,
  EventImageNotFoundError,
  GetEventImageUseCase,
} from '../../../../src/modules/events/application/get-event-image.use-case';
import { EventRepository } from '../../../../src/modules/events/domain/event.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_KEY = `events/${EVENT_ID}/images/event.png`;

describe('GetEventImageUseCase', () => {
  let events: jest.Mocked<EventRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let useCase: GetEventImageUseCase;

  beforeEach(() => {
    events = {
      findImageAccess: jest.fn(),
    } as unknown as jest.Mocked<EventRepository>;
    storage = {
      save: jest.fn(),
      findByKey: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new GetEventImageUseCase(events, storage);
  });

  it('returns the image when the authenticated user belongs to the event group', async () => {
    const image = {
      bytes: Uint8Array.from([137, 80, 78, 71]),
      contentType: 'image/png',
    };
    events.findImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: true });
    storage.findByKey.mockResolvedValue(image);

    await expect(useCase.execute(EVENT_ID, USER_ID)).resolves.toEqual(image);
    expect(events.findImageAccess).toHaveBeenCalledWith(EVENT_ID, USER_ID);
    expect(storage.findByKey).toHaveBeenCalledWith(IMAGE_KEY);
  });

  it('reports an event that does not exist', async () => {
    events.findImageAccess.mockResolvedValue(null);

    await expect(useCase.execute(EVENT_ID, USER_ID)).rejects.toBeInstanceOf(
      EventForImageNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('denies a user who does not belong to the event group', async () => {
    events.findImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: false });

    await expect(useCase.execute(EVENT_ID, USER_ID)).rejects.toBeInstanceOf(
      EventImageAccessDeniedError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an event without an image', async () => {
    events.findImageAccess.mockResolvedValue({ imageKey: null, userIsMember: true });

    await expect(useCase.execute(EVENT_ID, USER_ID)).rejects.toBeInstanceOf(
      EventImageNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an image missing from storage', async () => {
    events.findImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: true });
    storage.findByKey.mockResolvedValue(null);

    await expect(useCase.execute(EVENT_ID, USER_ID)).rejects.toBeInstanceOf(
      EventImageNotFoundError
    );
  });
});
