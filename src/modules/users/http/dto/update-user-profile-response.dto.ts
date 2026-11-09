import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileResponseDto {
  @ApiProperty({ example: 'Ana Beatriz Silva' })
  name!: string;
}
