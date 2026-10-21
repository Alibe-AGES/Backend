import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PLACE_ID_PATTERN } from '../../../../shared/places/places-provider';

const createProposalSchema = z
  .object({
    locationId: z.string().regex(PLACE_ID_PATTERN),
    name: z.string().trim().min(1),
  })
  .strict();

export class CreateProposalDto extends createZodDto(createProposalSchema) {
  @ApiProperty({
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    description: 'Google Place ID, the externalId returned by the locations feed and search.',
  })
  locationId!: string;

  @ApiProperty({ minLength: 1, example: 'Café de sábado' })
  name!: string;
}
