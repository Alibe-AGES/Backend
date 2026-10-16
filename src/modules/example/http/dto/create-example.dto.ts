import { ApiProperty } from '@nestjs/swagger';

export class CreateExampleDto {
  @ApiProperty({
    example: 'Imagem usada para demonstrar a integração entre PostgreSQL e S3.',
    maxLength: 500,
  })
  description!: string;
}
