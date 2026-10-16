import { ApiProperty } from '@nestjs/swagger';
import { ResponseDto } from './response-dto';
import { OwnerResponseDto } from './owner-details-response.dto';

export class ProposalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: OwnerResponseDto })
  owner!: OwnerResponseDto;

  @ApiProperty({ type: [ResponseDto] })
  responses!: Array<ResponseDto>;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;
}
