import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { GetUserProfilePictureUseCase } from './application/get-user-profile-picture.use-case';
import { UpdateUserProfilePictureUseCase } from './application/update-user-profile-picture.use-case';
import { GetCurrentUserSummaryUseCase } from './application/get-current-user-summary.use-case';
import { UserProfileRepository } from './domain/user-profile.repository';
import { UserImageRepository } from './domain/user-image.repository';
import { CurrentUserController } from './http/current-user.controller';
import { UsersController } from './http/users.controller';
import { PrismaUserProfileRepository } from './persistence/prisma-user-profile.repository';
import { PrismaUserImageRepository } from './persistence/prisma-user-image.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [UsersController, CurrentUserController],
  providers: [
    GetUserProfilePictureUseCase,
    UpdateUserProfilePictureUseCase,
    GetCurrentUserSummaryUseCase,
    {
      provide: UserProfileRepository,
      useClass: PrismaUserProfileRepository,
    },
    {
      provide: UserImageRepository,
      useClass: PrismaUserImageRepository,
    },
  ],
})
export class UsersModule {}
