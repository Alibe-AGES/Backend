import { Module } from '@nestjs/common';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';

@Module({
  controllers: [GroupsController, GroupInvitesController],
})
export class GroupsModule {}
