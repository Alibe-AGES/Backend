import {
  EventMemoriesAccessDeniedError,
  EventNotFoundError,
  GetEventMemoriesUseCase,
} from '../../../../src/modules/events/application/get-event-memories.use-case';
import { Event } from '../../../../src/modules/events/domain/event.entity';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';

const EVENT_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_USER_ID = '11111111-1111-4111-8111-111111111111';
const NON_MEMBER_USER_ID = '99999999-9999-4999-8999-999999999999';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';

function createEvent(overrides: Partial<Event> = {}): Event {
  return new Event({
    id: EVENT_ID,
    name: 'Jantar de aniversário',
    timeslot: new Date('2026-10-15T20:00:00.000Z'),
    image: `events/${EVENT_ID}/images/original.jpg`,
    budgetStart: '50.00',
    budgetEnd: '120.00',
    status: 'pending',
    groupId: GROUP_ID,
    location: {
      id: '44444444-4444-4444-8444-444444444444',
      description: 'Casa da Ana',
      manuallyCreated: true,
    },
    proposals: [],
    createdAt: new Date('2026-09-22T18:30:00.000Z'),
    updatedAt: new Date('2026-09-22T18:30:00.000Z'),
    ...overrides,
  });
}

describe('GetEventMemoriesUseCase', () => {
  let events: InMemoryEventRepository;
  let useCase: GetEventMemoriesUseCase;

  beforeEach(() => {
    events = new InMemoryEventRepository();
    events.set(createEvent());
    
    useCase = new GetEventMemoriesUseCase(events);
  });

  it('returns an empty list when the event has no memories', async () => {
    const result = await useCase.execute(EVENT_ID, MEMBER_USER_ID);

    expect(result).toEqual([]);
  });

  it('returns the list of memories when the event has associated memories and user is a member', async () => {
    const memory = {
      id: '77777777-7777-4777-8777-777777777777',
      picture: `events/${EVENT_ID}/memories/memory-1.jpg`,
      eventId: EVENT_ID,
    };

    const result = await useCase.execute(EVENT_ID, MEMBER_USER_ID);

    expect(result).toEqual([memory]);
    expect(result).toHaveLength(1);
  });

  it('reports a missing event', async () => {
    await expect(
      useCase.execute('00000000-0000-4000-8000-000000000000', MEMBER_USER_ID)
    ).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('denies access to a user who does not belong to the event group', async () => {
    await expect(
      useCase.execute(EVENT_ID, NON_MEMBER_USER_ID)
    ).rejects.toBeInstanceOf(EventMemoriesAccessDeniedError);
  });
});