import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ListGroupsUseCase } from './application/list-groups.use-case';
import { GroupRepository } from './domain/group.repository';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';
<<<<<<< HEAD
import { PrismaModule } from '../../../src/infrastructure/prisma/prisma.module';
import { StorageModule } from '../../../src/infrastructure/storage/storage.module';
import { CreateGroupUseCase } from './application/create-group.use-case';
import { GroupRepository } from './domain/group.repository';
import { PrismaGroupRepository } from './persistence/prisma-group.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    CreateGroupUseCase,
=======
import { PrismaGroupRepository } from './persistence/group.prisma.repository';

@Module({
  imports: [PrismaModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    ListGroupsUseCase,
>>>>>>> develop
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
  ],
})
export class GroupsModule {}
