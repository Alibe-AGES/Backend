import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetExampleUseCase } from '../application/get-example.use-case';
import { ExampleResponseDto } from './dto/example-response.dto';

@ApiTags('Example')
@Controller('example')
export class ExampleController {
  constructor(private readonly getExampleUseCase: GetExampleUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Verifica o funcionamento do módulo de exemplo' })
  @ApiOkResponse({ description: 'Módulo funcionando corretamente.', type: ExampleResponseDto })
  get(): Promise<ExampleResponseDto> {
    return this.getExampleUseCase.execute();
  }
}
