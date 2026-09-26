import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusEnum } from '../../../../../generated/prisma/enums';
import { ProposalDto } from './proposal-response.dto';
import { LocationResponseDto } from './location-response.dto';

export class EventDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 'Restaurante do Fulano', nullable: true })
  name?: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  timeslot?: Date | null;

  @ApiProperty({ example: '50.00' })
  budgetStart!: string;

  @ApiProperty({ example: '150.00' })
  budgetEnd!: string;

  @ApiProperty({ enum: StatusEnum })
  status!: StatusEnum;

  @ApiPropertyOptional({ type: Date, nullable: true })
  createdAt?: Date | null;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty()
  location!: LocationResponseDto;

  @ApiProperty({ type: [ProposalDto] })
  proposals!: Array<ProposalDto>;
}
