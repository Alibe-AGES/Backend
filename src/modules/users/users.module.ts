import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
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
import { RegisterPushTokenUseCase } from './application/register-push-token.use-case';
import { PushTokensController } from './http/push-tokens.controller';
import { SendTestPushNotificationUseCase } from './application/send-test-push-notification.use-case';

@Module({
  imports: [PrismaModule, StorageModule, MessagingModule],
  controllers: [UsersController, CurrentUserController, PushTokensController],
  providers: [
    GetUserProfilePictureUseCase,
    UpdateUserProfilePictureUseCase,
    GetCurrentUserSummaryUseCase,
    RegisterPushTokenUseCase,
    SendTestPushNotificationUseCase,
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
