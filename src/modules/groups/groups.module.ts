import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { GetGroupProfilePictureUseCase } from './application/get-group-profile-picture.use-case';
import { ListGroupsUseCase } from './application/list-groups.use-case';
import { GetGroupUseCase } from './application/get-group.use-case';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';
import { CreateGroupUseCase } from './application/create-group.use-case';
import { GetOrCreateGroupInviteLinkUseCase } from './application/get-or-create-group-invite-link.use-case';
import { JoinGroupByInviteUseCase } from './application/join-group-by-invite.use-case';
import { GroupRepository } from './domain/group.repository';
import { PrismaGroupRepository } from './persistence/group.prisma.repository';
import { GetAvailabilityIntervalsUseCase } from './application/get-availability-intervals.use-case';
import { ListGroupNotificationsUseCase } from './application/list-group-notifications.use-case';
import { GroupNotificationRepository } from './domain/group-notification.repository';
import { GroupNotificationsController } from './http/group-notifications.controller';
import { PrismaGroupNotificationRepository } from './persistence/prisma-group-notification.repository';
import { MarkAllGroupNotificationsReadUseCase } from './application/mark-all-group-notifications-read.use-case';
import { MarkGroupNotificationReadUseCase } from './application/mark-group-notification-read.use-case';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [GroupsController, GroupInvitesController, GroupNotificationsController],
  providers: [
    CreateGroupUseCase,
    GetAvailabilityIntervalsUseCase,
    GetGroupUseCase,
    GetOrCreateGroupInviteLinkUseCase,
    JoinGroupByInviteUseCase,
    GetGroupProfilePictureUseCase,
    ListGroupsUseCase,
    ListGroupNotificationsUseCase,
    MarkAllGroupNotificationsReadUseCase,
    MarkGroupNotificationReadUseCase,
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
    {
      provide: GroupNotificationRepository,
      useClass: PrismaGroupNotificationRepository,
    },
  ],
  exports: [GroupRepository],
})
export class GroupsModule {}
