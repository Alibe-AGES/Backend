import { Module } from '@nestjs/common';
import { ListGroupsUseCase } from './application/list-groups.use-case';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';
import { PrismaModule } from '../../../src/infrastructure/prisma/prisma.module';
import { StorageModule } from '../../../src/infrastructure/storage/storage.module';
import { CreateGroupUseCase } from './application/create-group.use-case';
import { GetOrCreateGroupInviteLinkUseCase } from './application/get-or-create-group-invite-link.use-case';
import { GroupRepository } from './domain/group.repository';
import { PrismaGroupRepository } from './persistence/group.prisma.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    CreateGroupUseCase,
    ListGroupsUseCase,
    GetOrCreateGroupInviteLinkUseCase,
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
  ],
})
export class GroupsModule {}
