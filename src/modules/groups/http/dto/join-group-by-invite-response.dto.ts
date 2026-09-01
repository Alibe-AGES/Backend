import { ApiProperty } from '@nestjs/swagger';

export class JoinGroupByInviteResponseDto {
  @ApiProperty({ format: 'uuid' })
  token!: string;
}
