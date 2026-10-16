import { ApiProperty } from '@nestjs/swagger';
import { GetAvailabilityUserResponseDto } from './get-availability-user-response.dto';

export class AvailabilitiesResponseDto {
  @ApiProperty({ format: 'date', example: '2026-09-05' })
  date!: string;

  @ApiProperty({ type: () => [GetAvailabilityUserResponseDto] })
  users!: Array<GetAvailabilityUserResponseDto>;
}
