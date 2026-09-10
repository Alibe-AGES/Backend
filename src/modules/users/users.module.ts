import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { GetUserProfilePictureUseCase } from './application/get-user-profile-picture.use-case';
import { UserImageRepository } from './domain/user-image.repository';
import { UsersController } from './http/users.controller';
import { PrismaUserImageRepository } from './persistence/prisma-user-image.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [UsersController],
  providers: [
    GetUserProfilePictureUseCase,
    {
      provide: UserImageRepository,
      useClass: PrismaUserImageRepository,
    },
  ],
})
export class UsersModule {}
