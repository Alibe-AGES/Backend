import { ApiProperty } from '@nestjs/swagger';

export class ExampleResponseDto {
  @ApiProperty({
    description: 'Mensagem retornada pelo módulo de exemplo.',
    example: 'Example module is working',
  })
  message!: string;
}
