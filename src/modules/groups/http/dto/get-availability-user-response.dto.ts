import { ApiProperty } from '@nestjs/swagger';

export class GetAvailabilityUserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Beatriz Silva' })
  name!: string;

  @ApiProperty({
    nullable: true,
    example: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
  })
  image!: string | null;

  @ApiProperty({ example: false })
  availableAllDay!: boolean;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$' },
    },
    example: [['14:00', '20:00']],
  })
  intervals!: Array<[string, string]>;
}
