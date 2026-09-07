import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { GetGroupProfilePictureUseCase } from './application/get-group-profile-picture.use-case';
import { ListGroupsUseCase } from './application/list-groups.use-case';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';
import { CreateGroupUseCase } from './application/create-group.use-case';
import { GroupRepository } from './domain/group.repository';
import { PrismaGroupRepository } from './persistence/group.prisma.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    CreateGroupUseCase,
    ListGroupsUseCase,
    GetGroupProfilePictureUseCase,
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
  ],
})
export class GroupsModule {}
