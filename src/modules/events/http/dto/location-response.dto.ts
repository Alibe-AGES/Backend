import { ApiProperty } from '@nestjs/swagger';

export class LocationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  manuallyCreated!: boolean | null;
}
