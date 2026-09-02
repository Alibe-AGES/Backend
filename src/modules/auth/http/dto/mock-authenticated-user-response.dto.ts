import { ApiProperty } from '@nestjs/swagger';

export class MockAuthenticatedUserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  id!: string;
}
