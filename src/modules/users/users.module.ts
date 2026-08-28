import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/prisma.module';
import { CreateUserUseCase } from './application/create-user.use-case';
import { DeleteUserUseCase } from './application/delete-user.use-case';
import { GetUserUseCase } from './application/get-user.use-case';
import { ListUsersUseCase } from './application/list-users.use-case';
import { UpdateUserUseCase } from './application/update-user.use-case';
import { UsersEventsService } from './application/users-events.service';
import { UserRepository } from './domain/user.repository';
import { UsersController } from './http/users.controller';
import { PrismaUserRepository } from './persistence/prisma-user.repository';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    UsersEventsService,
    {
      provide: UserRepository,
      useClass: PrismaUserRepository,
    },
  ],
})
export class UsersModule {}
