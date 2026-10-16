import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ type: String, format: 'date', example: '2026-05-14' })
  date!: string;

  @ApiProperty({ example: '18:00', nullable: true })
  startTime!: string | null;

  @ApiProperty({ example: '22:00', nullable: true })
  endTime!: string | null;
}
