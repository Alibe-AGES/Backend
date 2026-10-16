import { ApiProperty } from '@nestjs/swagger';

export class OwnerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    nullable: true,
    example: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
  })
  image!: string | null;
}
