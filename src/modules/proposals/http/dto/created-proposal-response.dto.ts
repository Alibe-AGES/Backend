import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from '../../../events/http/dto/owner-details-response.dto';

export class ProposalEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'date' })
  date!: string;

  @ApiProperty({ example: '15:00' })
  time!: string;

  @ApiProperty({ nullable: true, example: '30.00' })
  budgetStart!: string | null;

  @ApiProperty({ nullable: true, example: '60.00' })
  budgetEnd!: string | null;

  @ApiProperty({ enum: ['pending', 'confirmed', 'declined'] })
  status!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;
}

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

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: OwnerResponseDto })
  owner!: OwnerResponseDto;

  @ApiProperty({ type: ProposalEventResponseDto })
  event!: ProposalEventResponseDto;

  @ApiProperty({ type: ProposalLocationResponseDto })
  location!: ProposalLocationResponseDto;

  @ApiProperty({ enum: ['yes'] })
  myAnswer!: string;
}
