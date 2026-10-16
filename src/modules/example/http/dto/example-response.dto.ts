import { ApiProperty } from '@nestjs/swagger';

export class ExampleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: 'Imagem usada para demonstrar a integração entre PostgreSQL e S3.',
  })
  description!: string;

  @ApiProperty({ example: '/example/550e8400-e29b-41d4-a716-446655440000/image' })
  imageUrl!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
