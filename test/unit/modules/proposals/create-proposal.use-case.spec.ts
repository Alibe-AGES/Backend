import { CreateProposalUseCase } from '../../../../src/modules/proposals/application/create-proposal.use-case';
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
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { buildPlace } from '../../../helpers/place.fixture';

const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';
const input = {
  groupId: '33333333-3333-4333-8333-333333333333',
  userId: '11111111-1111-4111-8111-111111111111',
  externalId: PLACE_ID,
};
const storedLocation = {
  id: '22222222-2222-4222-8222-222222222222',
  externalId: PLACE_ID,
  name: 'Bloom Café',
  description: 'Salvo',
  address: 'Rua B',
  openingHours: [],
  rating: 4.5,
  phoneNumber: null,
  website: null,
  priceRange: { start: null, end: null, currencyCode: null },
  image: null,
  manuallyCreated: false,
};

describe('CreateProposalUseCase', () => {
  const proposals = {
    findGroupMembership: jest.fn(),
    findCatalogLocation: jest.fn(),
    findLocationById: jest.fn(),
    createSuggestion: jest.fn(),
  };
  const places = { getPlaceById: jest.fn() };
  const storage = { save: jest.fn(), delete: jest.fn(), findByKey: jest.fn() };
  const useCase = new CreateProposalUseCase(
    proposals as unknown as ProposalRepository,
    places as unknown as PlacesProvider,
    storage as unknown as ObjectStorage
  );

  beforeEach(() => {
    jest.resetAllMocks();
    proposals.findGroupMembership.mockResolvedValue(true);
    proposals.findCatalogLocation.mockResolvedValue(null);
    storage.save.mockResolvedValue(undefined);
    storage.delete.mockResolvedValue(undefined);
    places.getPlaceById.mockResolvedValue(
      buildPlace({
        externalId: PLACE_ID,
        name: 'Bloom Café',
        summary: 'Café tranquilo',
        address: 'Rua A',
        rating: 4.7,
        phoneNumber: '+55 51 3333-4444',
        websiteUri: 'https://bloom.example',
        openingHours: { weekdayDescriptions: ['segunda: 09:00–18:00'], periods: [] },
        priceRange: {
          start: { amount: 50, currencyCode: 'BRL' },
          end: { amount: 70, currencyCode: 'BRL' },
        },
      })
    );
    proposals.createSuggestion.mockResolvedValue({ id: 'proposal-id' });
  });

  it('fetches Place Details and persists the complete location on its first use', async () => {
    await expect(useCase.execute(input)).resolves.toEqual({ id: 'proposal-id' });
    expect(proposals.findCatalogLocation).toHaveBeenCalledWith(PLACE_ID);
    expect(places.getPlaceById).toHaveBeenCalledWith(PLACE_ID, { includePriceRange: true });
    expect(proposals.createSuggestion).toHaveBeenCalledWith({
      id: expect.any(String),
      groupId: input.groupId,
      ownerId: input.userId,
      location: {
        kind: 'new',
        value: {
          id: expect.any(String),
          externalId: PLACE_ID,
          name: 'Bloom Café',
          description: 'Café tranquilo',
          address: 'Rua A',
          openingHours: ['segunda: 09:00–18:00'],
          rating: 4.7,
          phoneNumber: '+55 51 3333-4444',
          website: 'https://bloom.example',
          priceRange: { start: '50.00', end: '70.00', currencyCode: 'BRL' },
          image: null,
          manuallyCreated: false,
        },
      },
      name: 'Bloom Café',
      createdAt: expect.any(Date),
    });
  });

  it('reuses a saved location without another Google Places request', async () => {
    proposals.findCatalogLocation.mockResolvedValue(storedLocation);
    await useCase.execute(input);
    expect(places.getPlaceById).not.toHaveBeenCalled();
    expect(proposals.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ location: { kind: 'existing', id: storedLocation.id } })
    );
  });

  it('reuses a location by its internal locationId', async () => {
    proposals.findLocationById.mockResolvedValue(storedLocation);
    await useCase.execute({ ...input, externalId: undefined, locationId: storedLocation.id });
    expect(proposals.findLocationById).toHaveBeenCalledWith(storedLocation.id);
    expect(proposals.findCatalogLocation).not.toHaveBeenCalled();
    expect(places.getPlaceById).not.toHaveBeenCalled();
  });

  it('creates a manual location when only address and optional data are supplied', async () => {
    await useCase.execute({
      ...input,
      externalId: undefined,
      address: 'Rua Manual, 123',
      name: 'Local manual',
    });
    expect(places.getPlaceById).not.toHaveBeenCalled();
    expect(proposals.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({
          kind: 'new',
          value: expect.objectContaining({
            externalId: null,
            name: 'Local manual',
            address: 'Rua Manual, 123',
            manuallyCreated: true,
          }),
        }),
      })
    );
  });

  it('stores an uploaded image for a new location and removes it if persistence fails', async () => {
    proposals.createSuggestion.mockRejectedValue(new Error('database unavailable'));
    const image = {
      originalName: 'local.png',
      contentType: 'image/png',
      bytes: Uint8Array.from([137, 80, 78, 71]),
    };

    await expect(useCase.execute({ ...input, image })).rejects.toThrow('database unavailable');

    expect(storage.save).toHaveBeenCalledWith({
      key: expect.stringMatching(/^locations\/.+\/images\/.+\.png$/),
      bytes: image.bytes,
      contentType: image.contentType,
    });
    const savedKey = storage.save.mock.calls[0][0].key;
    expect(storage.delete).toHaveBeenCalledWith(savedKey);
  });

  it('creates a manual location even when every descriptive field is omitted', async () => {
    await expect(
      useCase.execute({ groupId: input.groupId, userId: input.userId })
    ).resolves.toEqual({ id: 'proposal-id' });
    expect(proposals.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        name: null,
        location: expect.objectContaining({
          kind: 'new',
          value: expect.objectContaining({
            externalId: null,
            name: null,
            description: null,
            address: null,
            image: null,
            manuallyCreated: true,
          }),
        }),
      })
    );
  });

  it('rejects an ambiguous request containing locationId and externalId', async () => {
    await expect(useCase.execute({ ...input, locationId: storedLocation.id })).rejects.toThrow(
      'Informe locationId ou externalId, não ambos'
    );
  });

  it('allows a manual location with only its name', async () => {
    await expect(
      useCase.execute({ ...input, externalId: undefined, name: 'Local sem endereço' })
    ).resolves.toEqual({ id: 'proposal-id' });
  });

  it.each([
    [null, EventGroupNotFoundError],
    [false, EventGroupAccessDeniedError],
  ])('rejects membership %p before resolving the location', async (membership, error) => {
    proposals.findGroupMembership.mockResolvedValue(membership);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(error);
    expect(places.getPlaceById).not.toHaveBeenCalled();
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
