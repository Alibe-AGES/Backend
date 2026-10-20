import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Redirect,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlacesProviderUnavailableError } from '../../../shared/places/places-provider';
import { GetLocationUseCase, LocationNotFoundError } from '../application/get-location.use-case';
import {
  GetLocationPhotoUseCase,
  LocationPhotoNotFoundError,
} from '../application/get-location-photo.use-case';
import {
  type CatalogLocation,
  InvalidLocationSearchError,
  ListCatalogLocationsUseCase,
} from '../application/list-catalog-locations.use-case';
import { DAY_PERIODS, GROUP_SIZES, PLACE_ENVIRONMENTS } from '../domain/place-filters';
import { GetLocationPhotoQueryDto } from './dto/get-location-photo-query.dto';
import { ListLocationsQueryDto } from './dto/list-locations-query.dto';
import { LocationDetailsResponseDto } from './dto/location-details-response.dto';
import {
  LocationListItemResponseDto,
  LocationListResponseDto,
} from './dto/location-list-response.dto';

@ApiTags('Locations')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/locations')
export class LocationsController {
  constructor(
    private readonly listCatalogLocations: ListCatalogLocationsUseCase,
    private readonly getLocationPhoto: GetLocationPhotoUseCase,
    private readonly getLocation: GetLocationUseCase
  ) {}

  /**
   * GET /api/locations?latitude=-30.03&longitude=-51.22&page=1&limit=20
   * Searches Google Places near the user, applies the feed filters and registers the
   * returned page in the catalog (location with manually_created = false).
   */
  @Get()
  @ApiOperation({ summary: 'Lista locais do catálogo próximos ao usuário para o feed' })
  @ApiQuery({ name: 'latitude', type: Number, example: -30.0277 })
  @ApiQuery({ name: 'longitude', type: Number, example: -51.2287 })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, maximum: 20 })
  @ApiQuery({
    name: 'maxDistanceKm',
    type: Number,
    required: false,
    maximum: 50,
    description: 'Raio da busca em km. Omitido equivale a "qualquer distância" (50 km).',
  })
  @ApiQuery({ name: 'budgetMin', type: Number, required: false, description: 'Valor em R$.' })
  @ApiQuery({ name: 'budgetMax', type: Number, required: false, description: 'Valor em R$.' })
  @ApiQuery({ name: 'period', enum: DAY_PERIODS, required: false })
  @ApiQuery({ name: 'environment', enum: PLACE_ENVIRONMENTS, required: false })
  @ApiQuery({ name: 'groupSize', enum: GROUP_SIZES, required: false })
  @ApiQuery({
    name: 'type',
    type: String,
    required: false,
    example: 'restaurant',
    description: 'Tipo de local do Google Places (categoria do feed).',
  })
  @ApiOkResponse({ type: LocationListResponseDto })
  @ApiBadRequestResponse({ description: 'Coordenadas, paginação ou filtros inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiServiceUnavailableResponse({ description: 'Serviço de locais indisponível.' })
  async list(@Query() query: ListLocationsQueryDto): Promise<LocationListResponseDto> {
    try {
      const result = await this.listCatalogLocations.execute(query);

      return {
        items: result.items.map((item) => this.toItemResponse(item)),
        page: result.page,
        limit: result.limit,
        total: result.total,
      };
    } catch (error) {
      if (error instanceof InvalidLocationSearchError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof PlacesProviderUnavailableError) {
        throw new ServiceUnavailableException('Serviço de locais indisponível');
      }

      throw error;
    }
  }

  /**
   * GET /api/locations/photos?name=places/{placeId}/photos/{photoId}
   * Resolves the photo on Google Places and redirects to its public URL, keeping the API key
   * on the server. Used as the imageUrl of the feed items.
   */
  @Get('photos')
  @Redirect()
  @Header('Cache-Control', 'private, max-age=3600')
  @ApiOperation({ summary: 'Redireciona para a foto de um local do Google Places' })
  @ApiQuery({
    name: 'name',
    type: String,
    example: 'places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AUc7tXV...',
    description: 'Nome da foto retornado no imageUrl do feed.',
  })
  @ApiQuery({ name: 'maxWidthPx', type: Number, required: false, maximum: 4800, example: 800 })
  @ApiFoundResponse({ description: 'Redireciona para a URL pública da imagem.' })
  @ApiBadRequestResponse({ description: 'Nome da foto ou largura inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Foto não encontrada.' })
  async photo(
    @Query() query: GetLocationPhotoQueryDto
  ): Promise<{ url: string; statusCode: number }> {
    try {
      const url = await this.getLocationPhoto.execute(query.name, query.maxWidthPx);
      return { url, statusCode: HttpStatus.FOUND };
    } catch (error) {
      if (error instanceof LocationPhotoNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  /**
   * GET /api/locations/:locationId
   * Returns a location from the catalog for the detail screen. Declared after the static
   * routes so `photos` is not parsed as an id; the image comes from the photos route.
   */
  @Get(':locationId')
  @ApiOperation({ summary: 'Consulta os dados de um local' })
  @ApiParam({ name: 'locationId', format: 'uuid' })
  @ApiOkResponse({ type: LocationDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'locationId deve ser um UUID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Local não encontrado.' })
  async get(
    @Param('locationId', new ParseUUIDPipe()) locationId: string
  ): Promise<LocationDetailsResponseDto> {
    try {
      return await this.getLocation.execute(locationId);
    } catch (error) {
      if (error instanceof LocationNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  private toItemResponse({
    id,
    place,
    distanceMeters,
  }: CatalogLocation): LocationListItemResponseDto {
    const { priceRange } = place;
    const currencyCode = priceRange?.start?.currencyCode ?? priceRange?.end?.currencyCode;

    return {
      id,
      externalId: place.externalId,
      name: place.name,
      imageUrl: place.photoName
        ? `/api/locations/photos?${new URLSearchParams({ name: place.photoName })}`
        : null,
      description: place.summary,
      address: place.address,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      distanceMeters,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      priceLevel: place.priceLevel,
      priceRange:
        priceRange && currencyCode
          ? {
              start: priceRange.start?.amount ?? null,
              end: priceRange.end?.amount ?? null,
              currencyCode,
            }
          : null,
      phoneNumber: place.phoneNumber,
      website: place.websiteUri,
      googleMapsUri: place.googleMapsUri,
      primaryType: place.primaryType,
      openingHours: place.openingHours?.weekdayDescriptions ?? [],
    };
  }
}
