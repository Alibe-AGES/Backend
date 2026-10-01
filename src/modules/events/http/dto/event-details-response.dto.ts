import { ApiProperty } from '@nestjs/swagger';
import { ProposalDto } from './proposal-response.dto';
import { LocationResponseDto } from './location-response.dto';

export class EventDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jantar de aniversário', nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true, example: '2026-10-15' })
  date!: string | null;

  @ApiProperty({ nullable: true, example: '20:00' })
  time!: string | null;

  @ApiProperty({
    nullable: true,
    example: '/api/events/22222222-2222-4222-8222-222222222222/image',
  })
  image!: string | null;

  @ApiProperty({ example: '50.00' })
  budgetStart!: string;

  @ApiProperty({ example: '150.00' })
  budgetEnd!: string;

  @ApiProperty({ enum: ['pending', 'confirmed', 'declined'] })
  status!: 'pending' | 'confirmed' | 'declined';

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: LocationResponseDto, nullable: true })
  location!: LocationResponseDto | null;

  @ApiProperty({ type: ProposalDto })
  proposal!: ProposalDto;

  @ApiProperty({ type: Date, format: 'date-time', nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ type: Date, format: 'date-time' })
  updatedAt!: Date;
}
