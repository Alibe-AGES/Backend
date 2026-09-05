import { Module } from '@nestjs/common';
import { GroupsController } from './http/groups.controller';
import { GroupInvitesController } from './http/group-invites.controller';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { StorageModule } from 'src/infrastructure/storage/storage.module';
import { CreateGroupUseCase } from './application/create-group.use-case';
import { GroupRepository } from './domain/group.repository';
import { PrismaGroupRepository } from './persistence/prisma-group.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [GroupsController, GroupInvitesController],
  providers: [
    CreateGroupUseCase,
    {
      provide: GroupRepository,
      useClass: PrismaGroupRepository,
    },
  ],
})
export class GroupsModule {}
