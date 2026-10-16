import { ApiProperty } from '@nestjs/swagger';

export class GetGroupInviteLinkResponseDto {
  @ApiProperty({ format: 'uuid' })
  token!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;
}
