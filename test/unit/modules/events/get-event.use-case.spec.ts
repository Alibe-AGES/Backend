import {
  EventDetailsAccessDeniedError,
  EventNotFoundError,
  GetEventUseCase,
} from '../../../../src/modules/events/application/get-event.use-case';
import {
  type EventDetails,
  EventRepository,
} from '../../../../src/modules/events/domain/event.repository';

const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const event: EventDetails = {
  id: EVENT_ID,
  name: 'Jantar de aniversário',
  image: 'events/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/image.png',
  timeslot: new Date('2026-10-15T20:00:00.000Z'),
  budgetStart: '50.00',
  budgetEnd: '120.00',
  status: 'pending',
  groupId: '33333333-3333-4333-8333-333333333333',
  location: {
    id: '44444444-4444-4444-8444-444444444444',
    description: 'Rua dos Andradas, 1234, Porto Alegre',
    manuallyCreated: true,
  },
  proposal: {
    id: '55555555-5555-4555-8555-555555555555',
    owner: {
      id: USER_ID,
      name: 'Ana Beatriz Silva',
      image: 'users/11111111-1111-4111-8111-111111111111/profile-picture.jpg',
    },
    responses: [],
    createdAt: new Date('2026-09-22T18:30:00.000Z'),
  },
  createdAt: new Date('2026-09-22T18:30:00.000Z'),
  updatedAt: new Date('2026-09-23T14:00:00.000Z'),
};

describe('GetEventUseCase', () => {
  it('returns event details when the user belongs to the group', async () => {
    const findEventDetails = jest.fn().mockResolvedValue({
      event,
      userIsMember: true,
    });
    const repository = { findEventDetails } as unknown as EventRepository;
    const useCase = new GetEventUseCase(repository);

    await expect(useCase.execute(EVENT_ID, USER_ID)).resolves.toBe(event);
    expect(findEventDetails).toHaveBeenCalledWith(EVENT_ID, USER_ID);
  });

  it('reports an event that does not exist', async () => {
    const repository = {
      findEventDetails: jest.fn().mockResolvedValue(null),
    } as unknown as EventRepository;
    const useCase = new GetEventUseCase(repository);

    await expect(useCase.execute(EVENT_ID, USER_ID)).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('denies access when the user does not belong to the event group', async () => {
    const repository = {
      findEventDetails: jest.fn().mockResolvedValue({
        event,
        userIsMember: false,
      }),
    } as unknown as EventRepository;
    const useCase = new GetEventUseCase(repository);

    await expect(useCase.execute(EVENT_ID, USER_ID)).rejects.toBeInstanceOf(
      EventDetailsAccessDeniedError
    );
  });
});
