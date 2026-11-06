import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  StreamableFile,
} from '@nestjs/common';
import { LocationsController } from '../../../../src/modules/locations/http/locations.controller';
import { ListCatalogLocationsUseCase } from '../../../../src/modules/locations/application/list-catalog-locations.use-case';
import { SearchCatalogLocationsUseCase } from '../../../../src/modules/locations/application/search-catalog-locations.use-case';
import {
  GetLocationPhotoUseCase,
  LocationPhotoNotFoundError,
} from '../../../../src/modules/locations/application/get-location-photo.use-case';
import {
  GetLocationUseCase,
  LocationNotFoundError,
} from '../../../../src/modules/locations/application/get-location.use-case';
import { FindLocationByIdUseCase } from '../../../../src/modules/locations/application/find-location-by-id.use-case';
import {
  GetLocationImageUseCase,
  LocationImageAccessDeniedError,
  LocationImageNotFoundError,
} from '../../../../src/modules/locations/application/get-location-image.use-case';
import { InvalidLocationSearchError } from '../../../../src/modules/locations/application/services/catalog-locations-page.service';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { PlacesProviderUnavailableError } from '../../../../src/shared/places/places-provider';

describe('LocationsController', () => {
  let controller: LocationsController;
  let listCatalogLocations: jest.Mocked<ListCatalogLocationsUseCase>;
  let searchCatalogLocations: jest.Mocked<SearchCatalogLocationsUseCase>;
  let getLocationPhoto: jest.Mocked<GetLocationPhotoUseCase>;
  let getLocation: jest.Mocked<GetLocationUseCase>;
  let findLocationById: jest.Mocked<FindLocationByIdUseCase>;
  let getLocationImage: jest.Mocked<GetLocationImageUseCase>;

  const mockUserId = '987e6543-e21b-12d3-a456-426614174999';
  const mockRequest = {
    user: { id: mockUserId },
  } as unknown as AuthenticatedRequest;

  const mockPlace = {
    externalId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    name: 'Restaurante Teste',
    summary: 'Um ótimo lugar',
    address: 'Rua Teste, 123',
    location: { latitude: -30.02, longitude: -51.22 },
    rating: 4.5,
    userRatingCount: 100,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    phoneNumber: '51999999999',
    websiteUri: 'https://example.com',
    googleMapsUri: 'https://maps.google.com',
    primaryType: 'restaurant',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: ListCatalogLocationsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: SearchCatalogLocationsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetLocationPhotoUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetLocationUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindLocationByIdUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetLocationImageUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<LocationsController>(LocationsController);
    listCatalogLocations = module.get(ListCatalogLocationsUseCase);
    searchCatalogLocations = module.get(SearchCatalogLocationsUseCase);
    getLocationPhoto = module.get(GetLocationPhotoUseCase);
    getLocation = module.get(GetLocationUseCase);
    findLocationById = module.get(FindLocationByIdUseCase);
    getLocationImage = module.get(GetLocationImageUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('list', () => {
    it('should return catalog locations successfully', async () => {
      const query = { latitude: -30.03, longitude: -51.22, page: 1, limit: 10 };
      const pageResult = {
        items: [{ place: mockPlace as any, distanceMeters: 500 }],
        page: 1,
        limit: 10,
        total: 1,
      };

      listCatalogLocations.execute.mockResolvedValueOnce(pageResult as any);

      const result = await controller.list(query as any);

      expect(listCatalogLocations.execute).toHaveBeenCalledWith(query);
      expect(result.items).toHaveLength(1);
      expect(result.total).toEqual(1);
    });

    it('should translate InvalidLocationSearchError to BadRequestException', async () => {
      listCatalogLocations.execute.mockRejectedValueOnce(
        new InvalidLocationSearchError('Invalid search parameters')
      );

      await expect(controller.list({} as any)).rejects.toThrow(BadRequestException);
    });

    it('should translate PlacesProviderUnavailableError to ServiceUnavailableException', async () => {
      listCatalogLocations.execute.mockRejectedValueOnce(
        new PlacesProviderUnavailableError('Provider down')
      );

      await expect(controller.list({} as any)).rejects.toThrow(ServiceUnavailableException);
    });

    it('should rethrow unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected database error');
      listCatalogLocations.execute.mockRejectedValueOnce(unexpectedError);

      await expect(controller.list({} as any)).rejects.toThrow(unexpectedError);
    });
  });

  describe('image', () => {
    const locationId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return a StreamableFile when image is found and access is allowed', async () => {
      const imageResult = {
        bytes: Buffer.from('fake-image-bytes'),
        contentType: 'image/jpeg',
      };

      getLocationImage.execute.mockResolvedValueOnce(imageResult as any);

      const result = await controller.image(locationId, mockRequest);

      expect(getLocationImage.execute).toHaveBeenCalledWith(locationId, mockUserId);
      expect(result).toBeInstanceOf(StreamableFile);
    });

    it('should throw UnauthorizedException if user is missing in request', async () => {
      const unauthRequest = { user: undefined } as unknown as AuthenticatedRequest;

      await expect(controller.image(locationId, unauthRequest)).rejects.toThrow(
        UnauthorizedException
      );
      expect(getLocationImage.execute).not.toHaveBeenCalled();
    });

    it('should translate LocationForImageNotFoundError and LocationImageNotFoundError to NotFoundException', async () => {
      getLocationImage.execute.mockRejectedValueOnce(
        new LocationImageNotFoundError('Image not found')
      );

      await expect(controller.image(locationId, mockRequest)).rejects.toThrow(NotFoundException);
    });

    it('should translate LocationImageAccessDeniedError to ForbiddenException', async () => {
      getLocationImage.execute.mockRejectedValueOnce(
        new LocationImageAccessDeniedError('Access denied')
      );

      await expect(controller.image(locationId, mockRequest)).rejects.toThrow(ForbiddenException);
    });

    it('should rethrow unexpected errors', async () => {
      const unexpectedError = new Error('Disk read error');
      getLocationImage.execute.mockRejectedValueOnce(unexpectedError);

      await expect(controller.image(locationId, mockRequest)).rejects.toThrow(unexpectedError);
    });
  });

  describe('search', () => {
    it('should search catalog locations by text successfully', async () => {
      const query = { q: 'pizza', latitude: -30.03, longitude: -51.22 };
      const pageResult = {
        items: [{ place: mockPlace as any, distanceMeters: 200 }],
        page: 1,
        limit: 20,
        total: 1,
      };

      searchCatalogLocations.execute.mockResolvedValueOnce(pageResult as any);

      const result = await controller.search(query as any);

      expect(searchCatalogLocations.execute).toHaveBeenCalledWith({
        latitude: query.latitude,
        longitude: query.longitude,
        text: 'pizza',
      });
      expect(result.items).toHaveLength(1);
    });
  });

  describe('photo', () => {
    it('should resolve photo URL and return redirect status code', async () => {
      const query = { name: 'places/ChIJN/photos/1', maxWidthPx: 800 };
      const publicUrl = 'https://places.googleapis.com/v1/photos/1/media';

      getLocationPhoto.execute.mockResolvedValueOnce(publicUrl);

      const result = await controller.photo(query);

      expect(getLocationPhoto.execute).toHaveBeenCalledWith(query.name, query.maxWidthPx);
      expect(result).toEqual({ url: publicUrl, statusCode: 302 });
    });

    it('should translate LocationPhotoNotFoundError to NotFoundException', async () => {
      getLocationPhoto.execute.mockRejectedValueOnce(
        new LocationPhotoNotFoundError('Photo not found')
      );

      await expect(controller.photo({ name: 'invalid' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should rethrow unexpected photo errors', async () => {
      const unexpectedError = new Error('API timeout');
      getLocationPhoto.execute.mockRejectedValueOnce(unexpectedError);

      await expect(controller.photo({ name: 'invalid' } as any)).rejects.toThrow(unexpectedError);
    });
  });

  describe('getByGooglePlaceId', () => {
    const validPlaceId = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

    it('should return location details by Google Place ID', async () => {
      getLocation.execute.mockResolvedValueOnce(mockPlace as any);

      const result = await controller.getByGooglePlaceId(validPlaceId);

      expect(getLocation.execute).toHaveBeenCalledWith(validPlaceId);
      expect(result.externalId).toEqual(validPlaceId);
    });

    it('should throw BadRequestException if placeId format is invalid', async () => {
      const invalidPlaceId = 'invalid-id-format!';

      await expect(controller.getByGooglePlaceId(invalidPlaceId)).rejects.toThrow(
        BadRequestException
      );
      expect(getLocation.execute).not.toHaveBeenCalled();
    });

    it('should translate LocationNotFoundError to NotFoundException', async () => {
      getLocation.execute.mockResolvedValueOnce(mockPlace as any); // para passar a regex de validação do placeId
      getLocation.execute.mockRejectedValueOnce(new LocationNotFoundError('Not found'));

      // Testando diretamente a exceção de negócio
      getLocation.execute.mockReset();
      getLocation.execute.mockRejectedValueOnce(new LocationNotFoundError('Not found'));

      await expect(controller.getByGooglePlaceId(validPlaceId)).rejects.toThrow(NotFoundException);
    });

    it('should translate PlacesProviderUnavailableError to ServiceUnavailableException', async () => {
      getLocation.execute.mockRejectedValueOnce(new PlacesProviderUnavailableError('Service down'));

      await expect(controller.getByGooglePlaceId(validPlaceId)).rejects.toThrow(
        ServiceUnavailableException
      );
    });
  });

  describe('findById', () => {
    const locationId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return stored location by internal UUID successfully', async () => {
      const storedLocation = {
        id: locationId,
        ...mockPlace,
        image: { id: 'img-1' },
      };

      findLocationById.execute.mockResolvedValueOnce(storedLocation as any);

      const result = await controller.findById(locationId);

      expect(findLocationById.execute).toHaveBeenCalledWith(locationId);
      expect(result.imageUrl).toEqual(`/api/locations/${locationId}/image`);
    });

    it('should return null for imageUrl if stored location has no image', async () => {
      const storedLocation = {
        id: locationId,
        ...mockPlace,
        image: null,
      };

      findLocationById.execute.mockResolvedValueOnce(storedLocation as any);

      const result = await controller.findById(locationId);

      expect(result.imageUrl).toBeNull();
    });

    it('should translate LocationNotFoundError to NotFoundException', async () => {
      findLocationById.execute.mockRejectedValueOnce(new LocationNotFoundError('Not found'));

      await expect(controller.findById(locationId)).rejects.toThrow(NotFoundException);
    });

    it('should rethrow unexpected errors', async () => {
      const unexpectedError = new Error('DB error');
      findLocationById.execute.mockRejectedValueOnce(unexpectedError);

      await expect(controller.findById(locationId)).rejects.toThrow(unexpectedError);
    });
  });
});
