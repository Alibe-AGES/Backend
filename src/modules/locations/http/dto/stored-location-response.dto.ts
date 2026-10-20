import { ApiProperty } from '@nestjs/swagger';

export class StoredLocationResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d',
    description: 'Internal id of the location in the database.',
  })
  id!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    description: 'Google Place ID; null for manually created locations.',
  })
  externalId!: string | null;

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

  @ApiProperty({ type: Boolean, nullable: true, example: false })
  manuallyCreated!: boolean | null;
}
