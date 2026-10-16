import { ApiProperty } from '@nestjs/swagger';

export class PriceRangeResponseDto {
  @ApiProperty({ type: Number, nullable: true, example: 20 })
  start!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 100 })
  end!: number | null;

  @ApiProperty({ example: 'BRL' })
  currencyCode!: string;
}

export class LocationListItemResponseDto {
  @ApiProperty({ format: 'uuid', description: 'Id do local no catálogo interno.' })
  id!: string;

  @ApiProperty({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4', description: 'Place ID do Google.' })
  externalId!: string;

  @ApiProperty({ example: 'Bloom Café' })
  name!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Café com ambiente tranquilo e mesas externas',
  })
  description!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Rua Padre Chagas, 320 - Moinhos de Vento, Porto Alegre - RS',
  })
  address!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: -30.0277 })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -51.2006 })
  longitude!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1200 })
  distanceMeters!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 4.5 })
  rating!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 312 })
  userRatingCount!: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'PRICE_LEVEL_MODERATE' })
  priceLevel!: string | null;

  @ApiProperty({ type: PriceRangeResponseDto, nullable: true })
  priceRange!: PriceRangeResponseDto | null;

  @ApiProperty({ type: String, nullable: true, example: '(51) 3333-3333' })
  phoneNumber!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'https://www.bloomcafe.com' })
  website!: string | null;

  @ApiProperty({ type: String, nullable: true })
  googleMapsUri!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'cafe' })
  primaryType!: string | null;

  @ApiProperty({
    type: String,
    isArray: true,
    example: ['segunda-feira: 09:00–18:00', 'domingo: Fechado'],
  })
  openingHours!: string[];
}

export class LocationListResponseDto {
  @ApiProperty({ type: LocationListItemResponseDto, isArray: true })
  items!: LocationListItemResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 7 })
  total!: number;
}
