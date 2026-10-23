import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from '../../../events/http/dto/owner-details-response.dto';

export class ProposalLocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, nullable: true })
  externalId!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Restaurante Penne' })
  name!: string | null;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  address!: string | null;

  @ApiProperty({ type: [String], example: ['segunda-feira: 18:00–23:00'] })
  openingHours!: string[];

  @ApiProperty({ type: Number, nullable: true, example: 4.6 })
  rating!: number | null;

  @ApiProperty({ type: String, nullable: true, example: '+55 51 3333-4444' })
  phoneNumber!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'https://example.com' })
  website!: string | null;

  @ApiProperty({
    nullable: true,
    example: { start: '50.00', end: '70.00', currencyCode: 'BRL' },
  })
  priceRange!: { start: string | null; end: string | null; currencyCode: string | null } | null;

  @ApiProperty({ type: String, nullable: true, example: '/api/locations/uuid/image' })
  imageUrl!: string | null;

  @ApiProperty({ type: Boolean, nullable: true })
  manuallyCreated!: boolean | null;
}

export class CreatedProposalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['suggestion'] })
  type!: 'suggestion';

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Restaurante Penne' })
  name!: string | null;

  @ApiProperty({ type: String, format: 'date', example: '2026-10-23' })
  date!: string;

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
