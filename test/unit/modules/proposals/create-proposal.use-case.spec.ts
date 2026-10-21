import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../../../../src/modules/proposals/application/create-proposal.use-case';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../../../src/modules/events/application/create-event.use-case';
import {
  ProposalLocationNotFoundError,
  ProposalRepository,
} from '../../../../src/modules/proposals/domain/proposal.repository';
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
};

describe('CreateProposalUseCase', () => {
  const proposals = {
    findGroupMembership: jest.fn(),
    findCatalogLocation: jest.fn(),
    createSuggestion: jest.fn(),
  };
  const places = { getPlaceById: jest.fn() };
  const useCase = new CreateProposalUseCase(
    proposals as unknown as ProposalRepository,
    places as unknown as PlacesProvider
  );

  beforeEach(() => {
    jest.resetAllMocks();
    proposals.findGroupMembership.mockResolvedValue(true);
    proposals.findCatalogLocation.mockResolvedValue(null);
    places.getPlaceById.mockResolvedValue(
      buildPlace({ externalId: PLACE_ID, summary: 'Café tranquilo', address: 'Rua A' })
    );
    proposals.createSuggestion.mockResolvedValue({ id: 'proposal-id' });
  });

  it('trims the name and creates only the suggestion for the authenticated owner', async () => {
    await expect(useCase.execute(input)).resolves.toEqual({ id: 'proposal-id' });
    expect(proposals.findGroupMembership).toHaveBeenCalledWith(input.groupId, input.userId);
    expect(proposals.createSuggestion).toHaveBeenCalledWith({
      id: expect.any(String),
      groupId: input.groupId,
      ownerId: input.userId,
      location: { externalId: PLACE_ID, description: 'Café tranquilo', address: 'Rua A' },
      name: 'Café de sábado',
      createdAt: expect.any(Date),
    });
  });

  it('looks a new place up on Google, using the name when there is no summary', async () => {
    places.getPlaceById.mockResolvedValue(buildPlace({ externalId: PLACE_ID, summary: null }));

    await useCase.execute(input);

    expect(proposals.findCatalogLocation).toHaveBeenCalledWith(PLACE_ID);
    expect(places.getPlaceById).toHaveBeenCalledWith(PLACE_ID);
    expect(proposals.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ location: expect.objectContaining({ description: 'Bloom Café' }) })
    );
  });

  it('reuses a place already stored by a previous proposal without calling Google', async () => {
    proposals.findCatalogLocation.mockResolvedValue({
      id: 'location-id',
      description: 'Salvo',
      address: 'Rua B',
    });

    await useCase.execute(input);

    expect(places.getPlaceById).not.toHaveBeenCalled();
    expect(proposals.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { externalId: PLACE_ID, description: 'Salvo', address: 'Rua B' },
      })
    );
  });

  it.each([undefined, null, '', '   '])(
    'rejects invalid name %p before accessing persistence',
    async (name) => {
      await expect(useCase.execute({ ...input, name })).rejects.toBeInstanceOf(
        InvalidProposalCreationError
      );
      expect(proposals.findGroupMembership).not.toHaveBeenCalled();
      expect(proposals.createSuggestion).not.toHaveBeenCalled();
    }
  );

  it('rejects a missing locationId', async () => {
    await expect(useCase.execute({ ...input, locationId: undefined })).rejects.toBeInstanceOf(
      InvalidProposalCreationError
    );
    expect(proposals.createSuggestion).not.toHaveBeenCalled();
  });

  it.each([
    [null, EventGroupNotFoundError],
    [false, EventGroupAccessDeniedError],
  ])('rejects membership %p before looking up the location', async (membership, error) => {
    proposals.findGroupMembership.mockResolvedValue(membership);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(error);
    expect(proposals.findCatalogLocation).not.toHaveBeenCalled();
    expect(places.getPlaceById).not.toHaveBeenCalled();
    expect(proposals.createSuggestion).not.toHaveBeenCalled();
  });

  it('rejects a place unknown to Google without creating records', async () => {
    places.getPlaceById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ProposalLocationNotFoundError);
    expect(proposals.createSuggestion).not.toHaveBeenCalled();
  });

  it('propagates Google and persistence failures', async () => {
    places.getPlaceById.mockRejectedValueOnce(new PlacesProviderUnavailableError('down'));
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(PlacesProviderUnavailableError);

    proposals.createSuggestion.mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.execute(input)).rejects.toThrow('database unavailable');
  });
});
