import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Sse,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';

import { CreateUserUseCase } from '../application/create-user.use-case';
import { DeleteUserUseCase } from '../application/delete-user.use-case';
import { GetUserUseCase } from '../application/get-user.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { UpdateUserUseCase } from '../application/update-user.use-case';
import { UsersEventsService } from '../application/users-events.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
    private readonly events: UsersEventsService
  ) {}

  @Sse('events')
  @ApiOperation({ summary: 'Acompanha eventos de usuários via SSE' })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ description: 'Conexão SSE estabelecida.' })
  streamEvents(): Observable<MessageEvent> {
    return this.events.stream();
  }

  @Post()
  @ApiOperation({ summary: 'Cria um usuário' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(@Body() input: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.createUser.execute(input);

    return UserResponseDto.fromDomain(user);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os usuários' })
  @ApiOkResponse({ type: UserResponseDto, isArray: true })
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.listUsers.execute();

    return users.map(UserResponseDto.fromDomain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um usuário pelo ID' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<UserResponseDto> {
    const user = await this.getUser.execute(id);

    return UserResponseDto.fromDomain(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um usuário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateUserDto
  ): Promise<UserResponseDto> {
    const user = await this.updateUser.execute({ id, ...input });

    return UserResponseDto.fromDomain(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um usuário' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Usuário removido.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteUser.execute(id);
  }
}
