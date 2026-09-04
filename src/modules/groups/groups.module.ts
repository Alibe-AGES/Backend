import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ListGroupsUseCase } from './application/list-groups.use-case';
import { GroupRepository } from './domain/group.repository';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';
import { PrismaGroupRepository } from './persistence/group.prisma.repository';

@Module({
  imports: [PrismaModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    ListGroupsUseCase,
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
  ],
})
export class GroupsModule {}
