import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from './owner-details-response.dto';

export class ResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['pending', 'yes', 'no'] })
  answer!: 'pending' | 'yes' | 'no';

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: OwnerResponseDto })
  user!: OwnerResponseDto;
}
