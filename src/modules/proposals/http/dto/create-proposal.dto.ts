import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PLACE_ID_PATTERN } from '../../../../shared/places/places-provider';
import { decimalSchema } from '../../../events/http/dto/update-event.dto';

// DECIMAL(65,30) allows at most 35 significant integer digits.
const proposalBudgetSchema = decimalSchema.refine(
  (value) => value.split('.')[0].replace(/^-?0*/, '').length <= 35,
  { message: 'O orçamento deve ter no máximo 35 dígitos inteiros significativos' }
);

const createProposalSchema = z
  .object({
    locationId: z.string().regex(PLACE_ID_PATTERN),
    name: z.string().trim().min(1),
    date: z.iso.date(),
    time: z.iso.time({ precision: -1 }),
    budgetStart: proposalBudgetSchema.optional(),
    budgetEnd: proposalBudgetSchema.optional(),
  })
  .strict();

export class CreateProposalDto extends createZodDto(createProposalSchema) {
  @ApiProperty({
    example: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    description: 'Place ID do Google, igual ao id dos itens do feed e da pesquisa de locais.',
  })
  locationId!: string;

  @ApiProperty({ minLength: 1, example: 'Café de sábado' })
  name!: string;

  @ApiProperty({ format: 'date', example: '2026-10-17' })
  date!: string;

  @ApiProperty({ example: '15:00', description: 'Horário HH:mm interpretado em UTC.' })
  time!: string;

  @ApiPropertyOptional({ example: '30.00' })
  budgetStart?: string;

  @ApiPropertyOptional({ example: '60.00' })
  budgetEnd?: string;
}
