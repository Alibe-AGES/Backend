import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Redirect,
  Request,
  ServiceUnavailableException,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiFoundResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  type Place,
  PLACE_ID_PATTERN,
  PlacesProviderUnavailableError,
} from '../../../shared/places/places-provider';
import { FindLocationByIdUseCase } from '../application/find-location-by-id.use-case';
import {
  GetLocationImageUseCase,
  LocationForImageNotFoundError,
  LocationImageAccessDeniedError,
  LocationImageNotFoundError,
} from '../application/get-location-image.use-case';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { GetLocationUseCase, LocationNotFoundError } from '../application/get-location.use-case';
import {
  GetLocationPhotoUseCase,
  LocationPhotoNotFoundError,
} from '../application/get-location-photo.use-case';
import { ListCatalogLocationsUseCase } from '../application/list-catalog-locations.use-case';
import { SearchCatalogLocationsUseCase } from '../application/search-catalog-locations.use-case';
import {
  type CatalogLocation,
  type CatalogLocationsPage,
  InvalidLocationSearchError,
} from '../application/services/catalog-locations-page.service';
import { DAY_PERIODS, GROUP_SIZES, PLACE_ENVIRONMENTS } from '../domain/place-filters';
import { GetLocationPhotoQueryDto } from './dto/get-location-photo-query.dto';
import { ListLocationsQueryDto } from './dto/list-locations-query.dto';
import { LocationDetailsResponseDto } from './dto/location-details-response.dto';
import { SearchLocationsQueryDto } from './dto/search-locations-query.dto';
import { StoredLocationResponseDto } from './dto/stored-location-response.dto';
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
    private readonly searchCatalogLocations: SearchCatalogLocationsUseCase,
    private readonly getLocationPhoto: GetLocationPhotoUseCase,
    private readonly getLocation: GetLocationUseCase,
    private readonly findLocationById: FindLocationByIdUseCase,
    private readonly getLocationImage: GetLocationImageUseCase
  ) {}

  /**
   * GET /api/locations?latitude=-30.03&longitude=-51.22&page=1&limit=20
   * Searches Google Places near the user and applies the feed filters. Nothing is persisted;
   * the location is stored only when a proposal is created with it.
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
  list(@Query() query: ListLocationsQueryDto): Promise<LocationListResponseDto> {
    return this.toListResponse(this.listCatalogLocations.execute(query));
  }

  @Get(':locationId/image')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Obtém a imagem de um local visível ao usuário autenticado' })
  @ApiParam({ name: 'locationId', format: 'uuid' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp')
  @ApiOkResponse({
    description: 'Conteúdo binário da imagem.',
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo do local.' })
  @ApiNotFoundResponse({ description: 'Local ou imagem não encontrado.' })
  async image(
    @Param('locationId', new ParseUUIDPipe()) locationId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<StreamableFile> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

    try {
      const stored = await this.getLocationImage.execute(locationId, userId);
      return new StreamableFile(Buffer.from(stored.bytes), { type: stored.contentType });
    } catch (error) {
      if (
        error instanceof LocationForImageNotFoundError ||
        error instanceof LocationImageNotFoundError
      ) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof LocationImageAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /api/locations/search?q=pizza+vegana&latitude=-30.03&longitude=-51.22
   * Free-text search on Google Places, prioritizing places near the coordinates, with the same
   * filters and pagination as the feed.
   */
  @Get('search')
  @ApiOperation({ summary: 'Pesquisa locais do catálogo por texto livre' })
  @ApiQuery({
    name: 'q',
    type: String,
    maxLength: 200,
    example: 'pizza vegana',
    description: 'Texto da pesquisa, como nome, culinária ou tipo de local.',
  })
  @ApiQuery({ name: 'latitude', type: Number, example: -30.0277 })
  @ApiQuery({ name: 'longitude', type: Number, example: -51.2287 })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20, maximum: 20 })
  @ApiQuery({
    name: 'maxDistanceKm',
    type: Number,
    required: false,
    maximum: 50,
    description:
      'Distância máxima em km. Omitida, o Google apenas prioriza locais em até 50 km e pode ' +
      'retornar locais mais distantes.',
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
    description: 'Tipo de local do Google Places para restringir a pesquisa.',
  })
  @ApiOkResponse({ type: LocationListResponseDto })
  @ApiBadRequestResponse({ description: 'Texto, coordenadas, paginação ou filtros inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiServiceUnavailableResponse({ description: 'Serviço de locais indisponível.' })
  search(@Query() { q, ...filters }: SearchLocationsQueryDto): Promise<LocationListResponseDto> {
    return this.toListResponse(this.searchCatalogLocations.execute({ ...filters, text: q }));
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

  private async toListResponse(
    pending: Promise<CatalogLocationsPage>
  ): Promise<LocationListResponseDto> {
    try {
      const result = await pending;

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
   * GET /api/locations/google-places/:placeId
   * Looks the place up on Google Places (Place Details) by its Place ID, the same id returned by
   * the feed and the search.
   */
  @Get('google-places/:placeId')
  @ApiOperation({ summary: 'Consulta os dados de um local no Google Places pelo Place ID' })
  @ApiParam({
    name: 'placeId',
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    description: 'Google Place ID returned as externalId by the feed and the search.',
  })
  @ApiOkResponse({ type: LocationDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'placeId deve ser um Place ID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Local não encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'Serviço de locais indisponível.' })
  async getByGooglePlaceId(@Param('placeId') placeId: string): Promise<LocationDetailsResponseDto> {
    if (!PLACE_ID_PATTERN.test(placeId)) {
      throw new BadRequestException('placeId deve ser um Place ID válido');
    }

    try {
      return this.toPlaceResponse(await this.getLocation.execute(placeId));
    } catch (error) {
      if (error instanceof LocationNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof PlacesProviderUnavailableError) {
        throw new ServiceUnavailableException('Serviço de locais indisponível');
      }

      throw error;
    }
  }

  /**
   * GET /api/locations/:locationId
   * Returns a location stored in the database by its internal id, such as the location of an
   * event or proposal. Declared after the static routes so `photos` and `search` are not parsed
   * as an id.
   */
  @Get(':locationId')
  @ApiOperation({ summary: 'Consulta um local salvo no banco pelo id interno' })
  @ApiParam({
    name: 'locationId',
    format: 'uuid',
    description: 'Internal id of the location, as returned in events and proposals.',
  })
  @ApiOkResponse({ type: StoredLocationResponseDto })
  @ApiBadRequestResponse({ description: 'locationId deve ser um UUID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Local não encontrado.' })
  async findById(
    @Param('locationId', new ParseUUIDPipe()) locationId: string
  ): Promise<StoredLocationResponseDto> {
    try {
      const location = await this.findLocationById.execute(locationId);
      const { image, ...response } = location;
      return {
        ...response,
        imageUrl: image ? `/api/locations/${location.id}/image` : null,
      };
    } catch (error) {
      if (error instanceof LocationNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  private toItemResponse({ place, distanceMeters }: CatalogLocation): LocationListItemResponseDto {
    return { ...this.toPlaceResponse(place), distanceMeters };
  }

  private toPlaceResponse(place: Place): LocationDetailsResponseDto {
    const { priceRange } = place;
    const currencyCode = priceRange?.start?.currencyCode ?? priceRange?.end?.currencyCode;

    return {
      externalId: place.externalId,
      name: place.name,
      imageUrl: place.photoName
        ? `/api/locations/photos?${new URLSearchParams({ name: place.photoName })}`
        : null,
      description: place.summary,
      address: place.address,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
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
