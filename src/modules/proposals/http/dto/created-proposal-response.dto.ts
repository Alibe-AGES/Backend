import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from '../../../events/http/dto/owner-details-response.dto';

export class ProposalLocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;
}

export class CreatedProposalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['suggestion'] })
  type!: 'suggestion';

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ example: 'Café de sábado' })
  name!: string;

  @ApiProperty({ format: 'date', nullable: true, example: '2026-10-17' })
  date!: string | null;

  @ApiProperty({ nullable: true, example: '15:00' })
  time!: string | null;

  @ApiProperty({ nullable: true, example: '30.00' })
  budgetStart!: string | null;

  @ApiProperty({ nullable: true, example: '60.00' })
  budgetEnd!: string | null;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: OwnerResponseDto })
  owner!: OwnerResponseDto;

  @ApiProperty({ type: ProposalLocationResponseDto })
  location!: ProposalLocationResponseDto;

  @ApiProperty({ enum: ['yes'] })
  myAnswer!: string;

  @ApiProperty({
    example: false,
    description: 'true quando o autor é o único membro do grupo e a sugestão já nasce com match.',
  })
  matched!: boolean;
}
