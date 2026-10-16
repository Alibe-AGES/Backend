import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlacesProviderUnavailableError } from '../../../shared/places/places-provider';
import {
  type CatalogLocation,
  InvalidLocationSearchError,
  ListCatalogLocationsUseCase,
} from '../application/list-catalog-locations.use-case';
import { DAY_PERIODS, GROUP_SIZES, PLACE_ENVIRONMENTS } from '../domain/place-filters';
import { ListLocationsQueryDto } from './dto/list-locations-query.dto';
import {
  LocationListItemResponseDto,
  LocationListResponseDto,
} from './dto/location-list-response.dto';

@ApiTags('Locations')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/locations')
export class LocationsController {
  constructor(private readonly listCatalogLocations: ListCatalogLocationsUseCase) {}

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
