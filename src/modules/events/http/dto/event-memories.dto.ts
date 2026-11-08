import { ApiProperty } from '@nestjs/swagger';

export class EventMemoriesResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  picture!: string;

  @ApiProperty()
  eventId!: string;
}
