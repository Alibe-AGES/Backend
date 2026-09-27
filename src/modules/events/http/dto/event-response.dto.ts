import { ApiProperty, OmitType } from '@nestjs/swagger';

export class EventLocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  manuallyCreated!: boolean | null;
}

export class EventProposalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  ownerId!: string;
}

export class EventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true })
  name!: string | null;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  date!: string | null;

  @ApiProperty({ example: '21:00', nullable: true })
  time!: string | null;

  @ApiProperty({ nullable: true })
  image!: string | null;

  @ApiProperty({ nullable: true, example: '70.00' })
  budgetStart!: string | null;

  @ApiProperty({ nullable: true, example: '150.00' })
  budgetEnd!: string | null;

  @ApiProperty({ enum: ['pending', 'confirmed', 'declined'] })
  status!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: EventLocationResponseDto })
  location!: EventLocationResponseDto;

  @ApiProperty({ type: EventProposalResponseDto, nullable: true })
  proposal!: EventProposalResponseDto | null;

  @ApiProperty({ type: Date, format: 'date-time', nullable: true })
  createdAt!: Date | null;

  @ApiProperty({ type: Date, format: 'date-time' })
  updatedAt!: Date;
}

export class EventProposalAnswerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: ['pending', 'yes', 'no'] })
  answer!: string;
}

export class CreatedEventProposalResponseDto extends EventProposalResponseDto {
  @ApiProperty({ type: EventProposalAnswerResponseDto })
  response!: EventProposalAnswerResponseDto;
}

export class CreatedEventResponseDto extends OmitType(EventResponseDto, [
  'proposal',
  'updatedAt',
] as const) {
  @ApiProperty({ type: CreatedEventProposalResponseDto })
  proposal!: CreatedEventProposalResponseDto;
}
