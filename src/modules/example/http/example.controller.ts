import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateExampleUseCase, InvalidExampleError } from '../application/create-example.use-case';
import {
  ExampleImageNotFoundError,
  GetExampleImageUseCase,
} from '../application/get-example-image.use-case';
import { ExampleNotFoundError, GetExampleUseCase } from '../application/get-example.use-case';
import { Example } from '../domain/example.entity';
import { CreateExampleDto } from './dto/create-example.dto';
import { ExampleResponseDto } from './dto/example-response.dto';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Example')
@Controller('example')
export class ExampleController {
  constructor(
    private readonly createExampleUseCase: CreateExampleUseCase,
    private readonly getExampleUseCase: GetExampleUseCase,
    private readonly getExampleImageUseCase: GetExampleImageUseCase
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } }))
  @ApiOperation({ summary: 'Cria um exemplo com descrição no PostgreSQL e imagem no S3' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['description', 'image'],
      properties: {
        description: {
          type: 'string',
          maxLength: 500,
          example: 'Imagem usada para demonstrar a integração entre PostgreSQL e S3.',
        },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: ExampleResponseDto })
  @ApiBadRequestResponse({ description: 'Descrição ou imagem inválida.' })
  @ApiPayloadTooLargeResponse({ description: 'A imagem ultrapassa o limite de 5 MB.' })
  async create(
    @Body() input: CreateExampleDto,
    @UploadedFile() image?: Express.Multer.File
  ): Promise<ExampleResponseDto> {
    if (!image) {
      throw new BadRequestException('Image file is required');
    }

    try {
      const example = await this.createExampleUseCase.execute({
        description: input.description,
        image: {
          originalName: image.originalname,
          contentType: image.mimetype,
          bytes: image.buffer,
        },
      });

      return this.toResponse(example);
    } catch (error) {
      if (error instanceof InvalidExampleError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta a descrição e o endereço da imagem de um exemplo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ExampleResponseDto })
  @ApiNotFoundResponse({ description: 'Exemplo não encontrado.' })
  async get(@Param('id', new ParseUUIDPipe()) id: string): Promise<ExampleResponseDto> {
    try {
      return this.toResponse(await this.getExampleUseCase.execute(id));
    } catch (error) {
      if (error instanceof ExampleNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  @Get(':id/image')
  @ApiOperation({ summary: 'Obtém os bytes da imagem vinculada ao exemplo' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp')
  @ApiOkResponse({
    description: 'Conteúdo binário da imagem.',
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiNotFoundResponse({ description: 'Imagem não encontrada.' })
  async getImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response
  ): Promise<void> {
    try {
      const image = await this.getExampleImageUseCase.execute(id);
      response.setHeader('Content-Type', image.contentType);
      response.setHeader('Content-Length', image.bytes.byteLength);
      response.send(Buffer.from(image.bytes));
    } catch (error) {
      if (error instanceof ExampleImageNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  private toResponse(example: Example): ExampleResponseDto {
    return {
      id: example.id,
      description: example.description,
      imageUrl: `/example/${example.id}/image`,
      createdAt: example.createdAt,
    };
  }
}
