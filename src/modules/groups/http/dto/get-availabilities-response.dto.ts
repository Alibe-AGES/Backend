import { ApiProperty } from '@nestjs/swagger';
import { GetAvailabilityUserResponseDto } from './get-availability-user-response.dto';
import { IsDateString } from 'class-validator';

export class AvailabilitiesResponseDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiProperty()
  users!: Array<GetAvailabilityUserResponseDto>;
}
