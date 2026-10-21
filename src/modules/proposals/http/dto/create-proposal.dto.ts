import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PLACE_ID_PATTERN } from '../../../../shared/places/places-provider';

const createProposalSchema = z
  .object({
    locationId: z.uuid().optional(),
    externalId: z.string().regex(PLACE_ID_PATTERN).optional(),
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    address: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.locationId && data.externalId) {
      context.addIssue({
        code: 'custom',
        message: 'Informe locationId ou externalId, não ambos',
        path: ['locationId'],
      });
    }
  });

export class CreateProposalDto extends createZodDto(createProposalSchema) {
  @ApiProperty({ required: false, format: 'uuid', description: 'ID interno de um local já salvo.' })
  locationId?: string;

  @ApiProperty({
    required: false,
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    description: 'Place ID retornado pelo Google Places. O backend busca e salva os detalhes.',
  })
  externalId?: string;

  @ApiProperty({
    required: false,
    minLength: 1,
    example: 'Restaurante Penne',
    description: 'Nome opcional do local manual. Desnecessário com locationId ou externalId.',
  })
  name?: string;

  @ApiProperty({ required: false, example: 'Restaurante italiano com área externa.' })
  description?: string;

  @ApiProperty({ required: false, example: 'Rua Mariante, 154 - Porto Alegre - RS' })
  address?: string;
}
