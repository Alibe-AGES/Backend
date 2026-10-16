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
import { GetProposalByGroupUseCase } from '../proposals/application/get-proposals-by-group';
import { ProposalRepository } from '../proposals/domain/proposal.entity.repository';
import { PrismaProposalRepository } from '../proposals/persistence/prisma-proposal.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    CreateGroupUseCase,
    GetAvailabilityIntervalsUseCase,
    GetGroupUseCase,
    GetOrCreateGroupInviteLinkUseCase,
    JoinGroupByInviteUseCase,
    GetGroupProfilePictureUseCase,
    ListGroupsUseCase,
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
    GetProposalByGroupUseCase,
    {
      provide: ProposalRepository,
      useClass: PrismaProposalRepository,
    },
  ],
})
export class GroupsModule {}
