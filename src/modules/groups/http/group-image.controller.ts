import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  GetGroupImageUseCase,
  GroupImageNotFoundError,
} from '../application/get-group-image.use-case';

@ApiTags('Groups')
@Controller('group')
export class GroupImageController {
  constructor(private readonly getGroupImageUseCase: GetGroupImageUseCase) {}

  @Get(':groupId/image')
  @ApiOperation({ summary: 'Obtém os bytes da imagem vinculada ao grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')
  @ApiOkResponse({
    description: 'Conteúdo binário da imagem.',
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiNotFoundResponse({ description: 'Imagem não encontrada.' })
  async getImage(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Res() response: Response
  ): Promise<void> {
    try {
      const image = await this.getGroupImageUseCase.execute(groupId);
      response.setHeader('Content-Type', image.contentType);
      response.setHeader('Content-Length', image.bytes.byteLength);
      response.send(Buffer.from(image.bytes));
    } catch (error) {
      if (error instanceof GroupImageNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
