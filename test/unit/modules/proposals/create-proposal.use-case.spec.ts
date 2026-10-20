import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../../../../src/modules/proposals/application/create-proposal.use-case';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../../../src/modules/events/application/create-event.use-case';
import {
  EventLocationNotFoundError,
  EventRepository,
} from '../../../../src/modules/events/domain/event.repository';
import {
  PlacesProvider,
  PlacesProviderUnavailableError,
} from '../../../../src/shared/places/places-provider';
import { buildPlace } from '../../../helpers/place.fixture';

const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

const input = {
  groupId: '33333333-3333-4333-8333-333333333333',
  userId: '11111111-1111-4111-8111-111111111111',
  locationId: PLACE_ID,
  name: '  Café de sábado  ',
  date: '2026-10-17',
  time: '15:00',
};

describe('CreateProposalUseCase', () => {
  const events = {
    findGroupMembership: jest.fn(),
    findCatalogLocation: jest.fn(),
    createWithCatalogLocation: jest.fn(),
  };
  const places = { getPlaceById: jest.fn() };
  const useCase = new CreateProposalUseCase(
    events as unknown as EventRepository,
    places as unknown as PlacesProvider
  );

  beforeEach(() => {
    jest.resetAllMocks();
    events.findGroupMembership.mockResolvedValue(true);
    events.findCatalogLocation.mockResolvedValue(null);
    places.getPlaceById.mockResolvedValue(
      buildPlace({ externalId: PLACE_ID, summary: 'Café tranquilo', address: 'Rua A' })
    );
    events.createWithCatalogLocation.mockResolvedValue({ id: 'proposal-id' });
  });

  it('trims the name, uses UTC, and creates a pending event with the authenticated owner answering yes', async () => {
    await expect(useCase.execute(input)).resolves.toEqual({ id: 'proposal-id' });
    expect(events.findGroupMembership).toHaveBeenCalledWith(input.groupId, input.userId);
    expect(events.createWithCatalogLocation).toHaveBeenCalledWith({
      id: expect.any(String),
      groupId: input.groupId,
      ownerId: input.userId,
      location: { externalId: PLACE_ID, description: 'Café tranquilo', address: 'Rua A' },
      name: 'Café de sábado',
      timeslot: new Date('2026-10-17T15:00:00.000Z'),
      image: null,
      budgetStart: null,
      budgetEnd: null,
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: expect.any(Date),
    });
  });

  it('looks a new place up on Google, using the name when there is no summary', async () => {
    places.getPlaceById.mockResolvedValue(buildPlace({ externalId: PLACE_ID, summary: null }));

    await useCase.execute(input);

    expect(events.findCatalogLocation).toHaveBeenCalledWith(PLACE_ID);
    expect(places.getPlaceById).toHaveBeenCalledWith(PLACE_ID);
    expect(events.createWithCatalogLocation).toHaveBeenCalledWith(
      expect.objectContaining({ location: expect.objectContaining({ description: 'Bloom Café' }) })
    );
  });

  it('reuses a place already stored by a previous proposal without calling Google', async () => {
    events.findCatalogLocation.mockResolvedValue({
      id: 'location-id',
      description: 'Salvo',
      address: 'Rua B',
    });

    await useCase.execute(input);

    expect(places.getPlaceById).not.toHaveBeenCalled();
    expect(events.createWithCatalogLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { externalId: PLACE_ID, description: 'Salvo', address: 'Rua B' },
      })
    );
  });

  it('preserves an independently supplied budget bound', async () => {
    await useCase.execute({ ...input, budgetEnd: '60.123' });
    expect(events.createWithCatalogLocation).toHaveBeenCalledWith(
      expect.objectContaining({ budgetStart: null, budgetEnd: '60.123' })
    );
  });

  it.each([undefined, null, '', '   '])(
    'rejects invalid name %p before accessing persistence',
    async (name) => {
      await expect(useCase.execute({ ...input, name })).rejects.toBeInstanceOf(
        InvalidProposalCreationError
      );
      expect(events.findGroupMembership).not.toHaveBeenCalled();
      expect(events.createWithCatalogLocation).not.toHaveBeenCalled();
    }
  );

  it.each(['date', 'time', 'locationId'] as const)('rejects missing %s', async (field) => {
    await expect(useCase.execute({ ...input, [field]: undefined })).rejects.toBeInstanceOf(
      InvalidProposalCreationError
    );
    expect(events.createWithCatalogLocation).not.toHaveBeenCalled();
  });

  it.each([
    [null, EventGroupNotFoundError],
    [false, EventGroupAccessDeniedError],
  ])('rejects membership %p before looking up the location', async (membership, error) => {
    events.findGroupMembership.mockResolvedValue(membership);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(error);
    expect(events.findCatalogLocation).not.toHaveBeenCalled();
    expect(places.getPlaceById).not.toHaveBeenCalled();
    expect(events.createWithCatalogLocation).not.toHaveBeenCalled();
  });

  it('rejects a place unknown to Google without creating records', async () => {
    places.getPlaceById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(EventLocationNotFoundError);
    expect(events.createWithCatalogLocation).not.toHaveBeenCalled();
  });

  it('propagates Google and persistence failures', async () => {
    places.getPlaceById.mockRejectedValueOnce(new PlacesProviderUnavailableError('down'));
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(PlacesProviderUnavailableError);

    events.createWithCatalogLocation.mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.execute(input)).rejects.toThrow('database unavailable');
  });
});
