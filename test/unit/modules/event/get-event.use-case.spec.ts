import { InMemoryEventRepository } from '../../../../test/helpers/in-memory-event.repository';
import { EventNotFoundError, GetEventUseCase } from '../../../../src/modules/event/application/get-event.use-case';
import { EventRepository } from 'src/modules/event/domain/event.repository';

const DEMO_EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const EVENT_WITHLOCATION_ENTITY = {
    id: DEMO_EVENT_ID,
    name: "Jantar de aniversário",
    timeslot: "2026-10-15T20:00:00.000Z",
    budgetStart: "50.00",
    budgetEnd: "120.00",
    status: "pending",
    groupId: "33333333-3333-4333-8333-333333333333",
    createdAt: "2026-09-22T18:30:00.000Z",
    updatedAt: "2026-09-23T14:00:00.000Z",
    location: {
        id: "44444444-4444-4444-8444-444444444444",
        description: "Rua dos Andradas, 1234, Porto Alegre",
        manuallyCreated: true
    },
    proposals: [
        {
            id: "55555555-5555-4555-8555-555555555555",
            owner: {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Ana Beatriz Silva",
                image: "https://example.com/users/ana.jpg"
            },
            responses: [
                {
                    id: "66666666-6666-4666-8666-666666666666",
                    answer: "yes",
                    createdAt: "2026-09-22T18:30:00.000Z",
                    user: {
                        id: "11111111-1111-4111-8111-111111111111",
                        name: "Ana Beatriz Silva",
                        image: "https://example.com/users/ana.jpg"
                    }
                }
            ],
            createdAt: "2026-09-22T18:30:00.000Z"
        }
    ]
};

const SECOND_DEMO_ID = 'aaaaaaaa-bbbb-4bbb-8bbb-aaaaaaaaaaaa';
const EVENT_WITHOUTLOCATION = {
    id: SECOND_DEMO_ID,
    name: "Jantar de aniversário",
    timeslot: "2026-10-15T20:00:00.000Z",
    budgetStart: "50.00",
    budgetEnd: "120.00",
    status: "pending",
    groupId: "33333333-3333-4333-8333-333333333333",
    createdAt: "2026-09-22T18:30:00.000Z",
    updatedAt: "2026-09-23T14:00:00.000Z",
    location: null,
    proposals: [
        {
            id: "55555555-5555-4555-8555-555555555555",
            owner: {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Ana Beatriz Silva",
                image: "https://example.com/users/ana.jpg"
            },
            responses: [
                {
                    id: "66666666-6666-4666-8666-666666666666",
                    answer: "yes",
                    createdAt: "2026-09-22T18:30:00.000Z",
                    user: {
                        id: "11111111-1111-4111-8111-111111111111",
                        name: "Ana Beatriz Silva",
                        image: "https://example.com/users/ana.jpg"
                    }
                }
            ],
            createdAt: "2026-09-22T18:30:00.000Z"
        }
    ]
};

describe('GetEventUseCase', () => {
  it('returns the event details with location', async () => {
    const findById = jest.fn().mockResolvedValue(EVENT_WITHLOCATION_ENTITY);
    const repository = { findById } as unknown as EventRepository;
    const useCase = new GetEventUseCase(repository);
    
    const expectedResponse = {
      id: DEMO_EVENT_ID,
      name: "Jantar de aniversário",
      timeslot: "2026-10-15T20:00:00.000Z",
      budgetStart: "50.00",
      budgetEnd: "120.00",
      status: "pending",
      createdAt: "2026-09-22T18:30:00.000Z",
      groupId: "33333333-3333-4333-8333-333333333333",
      location: {
        id: "44444444-4444-4444-8444-444444444444",
        description: "Rua dos Andradas, 1234, Porto Alegre",
        manuallyCreated: true
      },
      proposals: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          ownerId: "11111111-1111-4111-8111-111111111111",
          ownerName: "Ana Beatriz Silva",
          ownerProfilePic: "https://example.com/users/ana.jpg",
          createdAt: "2026-09-22T18:30:00.000Z",
          responses: [
            {
              id: "66666666-6666-4666-8666-666666666666",
              answer: "yes",
              createdAt: "2026-09-22T18:30:00.000Z",
              userId: "11111111-1111-4111-8111-111111111111",
              userName: "Ana Beatriz Silva",
              userProfilePic: "https://example.com/users/ana.jpg"
            }
          ]
        }
      ]
    };

    const result = await useCase.execute(DEMO_EVENT_ID);

    expect(result).toEqual(expectedResponse);
  });

  it('returns the event details without location', async () => {
    const findById = jest.fn().mockResolvedValue(EVENT_WITHOUTLOCATION);
    const repository = { findById } as unknown as EventRepository;
    const useCase = new GetEventUseCase(repository);

    const expectedResponse = {
      id: SECOND_DEMO_ID,
      name: "Jantar de aniversário",
      timeslot: "2026-10-15T20:00:00.000Z",
      budgetStart: "50.00",
      budgetEnd: "120.00",
      status: "pending",
      createdAt: "2026-09-22T18:30:00.000Z",
      groupId: "33333333-3333-4333-8333-333333333333",
      location: null,
      proposals: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          ownerId: "11111111-1111-4111-8111-111111111111",
          ownerName: "Ana Beatriz Silva",
          ownerProfilePic: "https://example.com/users/ana.jpg",
          createdAt: "2026-09-22T18:30:00.000Z",
          responses: [
            {
              id: "66666666-6666-4666-8666-666666666666",
              answer: "yes",
              createdAt: "2026-09-22T18:30:00.000Z",
              userId: "11111111-1111-4111-8111-111111111111",
              userName: "Ana Beatriz Silva",
              userProfilePic: "https://example.com/users/ana.jpg"
            }
          ]
        }
      ]
    };

    const result = await useCase.execute(SECOND_DEMO_ID);

    expect(result).toEqual(expectedResponse);
  });

  it('reports an event that does not exist', async () => {
    const events = new InMemoryEventRepository();
    const useCase = new GetEventUseCase(events);

    await expect(useCase.execute('550e8400-e29b-41d4-a716-446655440000')).rejects.toBeInstanceOf(
      EventNotFoundError
    );
  });
});