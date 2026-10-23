import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from '../../../events/http/dto/owner-details-response.dto';
import { ProposalLocationResponseDto } from './created-proposal-response.dto';

export class ProposalDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['suggestion', 'event'] })
  type!: 'suggestion' | 'event';

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  eventId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  date!: string | null;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: Date, format: 'date-time', nullable: true })
  matchedAt!: Date | null;

  @ApiProperty({ example: false })
  matched!: boolean;

  @ApiProperty({ type: OwnerResponseDto })
  owner!: OwnerResponseDto;

  @ApiProperty({ type: ProposalLocationResponseDto, nullable: true })
  location!: ProposalLocationResponseDto | null;

  @ApiProperty({ enum: ['pending', 'yes', 'no'], nullable: true })
  myAnswer!: 'pending' | 'yes' | 'no' | null;
}
