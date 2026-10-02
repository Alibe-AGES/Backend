import { ApiProperty } from '@nestjs/swagger';

export class CalendarDayResponseDto {
  @ApiProperty({ type: String, format: 'date', example: '2026-05-22' })
  date!: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    isArray: true,
    description: 'IDs dos encontros marcados para o dia.',
  })
  scheduledEventIds!: string[];

  @ApiProperty({
    type: String,
    format: 'uuid',
    isArray: true,
    description: 'IDs das propostas de encontro para o dia.',
  })
  proposalIds!: string[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        proposalId: { type: 'string', format: 'uuid' },
        eventId: { type: 'string', format: 'uuid' },
      },
    },
    description: 'Associação entre cada proposta e o encontro que contém seus detalhes.',
  })
  proposalEventIds!: { proposalId: string; eventId: string }[];

  @ApiProperty({
    type: String,
    format: 'uuid',
    isArray: true,
    description: 'IDs dos usuários disponíveis no dia.',
  })
  availableUserIds!: string[];

  @ApiProperty({
    type: String,
    format: 'uuid',
    isArray: true,
    description: 'IDs dos encontros já realizados no dia.',
  })
  completedEventIds!: string[];

  @ApiProperty({ example: false })
  allUsersAvailable!: boolean;
}
