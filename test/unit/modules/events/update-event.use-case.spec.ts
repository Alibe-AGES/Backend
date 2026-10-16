import {
  EventAccessDeniedError,
  EventNotFoundError,
  InvalidEventUpdateError,
  UpdateEventUseCase,
} from '../../../../src/modules/events/application/update-event.use-case';
import { Event } from '../../../../src/modules/events/domain/event.entity';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ORIGINAL_IMAGE_KEY = `events/${EVENT_ID}/images/original.jpg`;

function createEvent(overrides: Partial<Event> = {}): Event {
  return new Event({
    id: EVENT_ID,
    name: 'Jantar de aniversário',
    timeslot: new Date('2026-10-15T20:00:00.000Z'),
    image: ORIGINAL_IMAGE_KEY,
    budgetStart: '50.00',
    budgetEnd: '120.00',
    status: 'pending',
    groupId: '33333333-3333-4333-8333-333333333333',
    location: {
      id: '44444444-4444-4444-8444-444444444444',
      description: 'Casa da Ana',
      manuallyCreated: true,
    },
    proposals: [{ id: '55555555-5555-4555-8555-555555555555', ownerId: OWNER_ID }],
    createdAt: new Date('2026-09-22T18:30:00.000Z'),
    updatedAt: new Date('2026-09-22T18:30:00.000Z'),
    ...overrides,
  });
}

describe('UpdateEventUseCase', () => {
  let events: InMemoryEventRepository;
  let useCase: UpdateEventUseCase;
  let storage: InMemoryObjectStorage;

  beforeEach(() => {
    events = new InMemoryEventRepository();
    storage = new InMemoryObjectStorage();
    events.set(createEvent());
    useCase = new UpdateEventUseCase(events, storage);
  });

  it('updates only the name', async () => {
    const result = await useCase.execute(EVENT_ID, OWNER_ID, { name: 'Jantar atualizado' });

    expect(result.name).toBe('Jantar atualizado');
    expect(result.image).toBe(ORIGINAL_IMAGE_KEY);
    expect(result.budgetStart).toBe('50.00');
  });

  it('updates multiple fields and combines date/time in UTC', async () => {
    const result = await useCase.execute(EVENT_ID, OWNER_ID, {
      name: 'Jantar atualizado',
      date: '2026-10-16',
      time: '21:00',
      location: 'Avenida Ipiranga, 1500, Porto Alegre',
      budgetStart: '70.00',
      budgetEnd: '150.00',
    });

    expect(result.timeslot?.toISOString()).toBe('2026-10-16T21:00:00.000Z');
    expect(result.location).toEqual({
      id: '66666666-6666-4666-8666-666666666666',
      description: 'Avenida Ipiranga, 1500, Porto Alegre',
      manuallyCreated: true,
    });
    expect(result.budgetStart).toBe('70.00');
    expect(result.budgetEnd).toBe('150.00');
  });

  it('stores an uploaded image, persists its key and removes the previous object', async () => {
    await storage.save({
      key: ORIGINAL_IMAGE_KEY,
      bytes: Uint8Array.from([0xff, 0xd8, 0xff]),
      contentType: 'image/jpeg',
    });

    const result = await useCase.execute(EVENT_ID, OWNER_ID, {
      image: {
        originalName: 'event.png',
        contentType: 'image/png',
        bytes: PNG_BYTES,
      },
    });

    expect(result.image).toMatch(
      new RegExp(`^events/${EVENT_ID}/images/[0-9a-f-]{36}\\.png$`, 'i')
    );
    expect(result.name).toBe('Jantar de aniversário');
    await expect(storage.findByKey(result.image)).resolves.toEqual({
      bytes: PNG_BYTES,
      contentType: 'image/png',
    });
    await expect(storage.findByKey(ORIGINAL_IMAGE_KEY)).resolves.toBeNull();
  });

  it.each([
    {
      originalName: 'event.png',
      contentType: 'text/plain',
      bytes: PNG_BYTES,
    },
    {
      originalName: 'event.txt',
      contentType: 'image/png',
      bytes: PNG_BYTES,
    },
  ])('rejects an upload with invalid content type or extension', async (image) => {
    await expect(useCase.execute(EVENT_ID, OWNER_ID, { image })).rejects.toBeInstanceOf(
      InvalidEventUpdateError
    );
  });

  it('removes the new object when database persistence fails', async () => {
    const deleteSpy = jest.spyOn(storage, 'delete');
    jest.spyOn(events, 'update').mockRejectedValue(new Error('database unavailable'));

    await expect(
      useCase.execute(EVENT_ID, OWNER_ID, {
        image: { originalName: 'event.png', contentType: 'image/png', bytes: PNG_BYTES },
      })
    ).rejects.toThrow('database unavailable');

    const newImageKey = deleteSpy.mock.calls[0][0];
    expect(newImageKey).toMatch(new RegExp(`^events/${EVENT_ID}/images/[0-9a-f-]{36}\\.png$`, 'i'));
    await expect(storage.findByKey(newImageKey)).resolves.toBeNull();
  });

  it('removes only budgetStart when null is explicitly provided', async () => {
    const result = await useCase.execute(EVENT_ID, OWNER_ID, { budgetStart: null });

    expect(result.budgetStart).toBeNull();
    expect(result.budgetEnd).toBe('120.00');
  });

  it('preserves all fields omitted from a partial update', async () => {
    const result = await useCase.execute(EVENT_ID, OWNER_ID, { budgetEnd: '200.00' });

    expect(result.name).toBe('Jantar de aniversário');
    expect(result.timeslot?.toISOString()).toBe('2026-10-15T20:00:00.000Z');
    expect(result.image).toBe(ORIGINAL_IMAGE_KEY);
    expect(result.budgetStart).toBe('50.00');
    expect(result.budgetEnd).toBe('200.00');
  });

  it('rejects an empty update', async () => {
    await expect(useCase.execute(EVENT_ID, OWNER_ID, {})).rejects.toBeInstanceOf(
      InvalidEventUpdateError
    );
  });

  it('reports a missing event', async () => {
    await expect(
      useCase.execute('77777777-7777-4777-8777-777777777777', OWNER_ID, { name: 'Novo' })
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('denies a user who owns none of the event proposals', async () => {
    await expect(useCase.execute(EVENT_ID, OTHER_USER_ID, { name: 'Novo' })).rejects.toBeInstanceOf(
      EventAccessDeniedError
    );
  });

  it('allows a user who owns an associated proposal', async () => {
    await expect(useCase.execute(EVENT_ID, OWNER_ID, { name: 'Novo' })).resolves.toMatchObject({
      name: 'Novo',
    });
  });

  it('preserves the current date when only time changes', async () => {
    const result = await useCase.execute(EVENT_ID, OWNER_ID, { time: '22:15' });

    expect(result.timeslot?.toISOString()).toBe('2026-10-15T22:15:00.000Z');
  });

  it('requires a date when only time is sent for an event without a timeslot', async () => {
    events.set(createEvent({ timeslot: null }));

    await expect(useCase.execute(EVENT_ID, OWNER_ID, { time: '22:15' })).rejects.toBeInstanceOf(
      InvalidEventUpdateError
    );
  });
});
