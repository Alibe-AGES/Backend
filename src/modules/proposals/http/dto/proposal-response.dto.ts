import { ApiProperty } from '@nestjs/swagger';

export class ProposalResponseDto {
  @ApiProperty({ format: 'uuid', example: '66666666-6666-4666-8666-666666666666' })
  id!: string;

  @ApiProperty({ format: 'uuid', example: '55555555-5555-4555-8555-555555555555' })
  proposalId!: string;

  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  userId!: string;

  @ApiProperty({ enum: ['pending', 'yes', 'no'], example: 'yes' })
  answer!: string;

  @ApiProperty({ type: Date, format: 'date-time', example: '2026-09-22T18:30:00.000Z' })
  createdAt!: Date;
}
