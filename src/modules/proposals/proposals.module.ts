import { Module } from '@nestjs/common';
import { GooglePlacesModule } from '../../infrastructure/api/google-places/google-places.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CreateProposalUseCase } from './application/create-proposal.use-case';
import { ProposalsController } from './http/proposals.controller';
import { CreateProposalResponseUseCase } from './application/create-proposal-response.use-case';
import { UpdateProposalResponseUseCase } from './application/update-proposal-response.use-case';
import { ProposalRepository } from './domain/proposal.repository';
import { ProposalResponseRepository } from './domain/proposal-response.repository';
import { ProposalResponseController } from './http/proposal-response.controller';
import { PrismaProposalRepository } from './persistence/prisma-proposal.repository';
import { PrismaProposalResponseRepository } from './persistence/prisma-proposal-response.repository';
import { GetProposalByIdUseCase } from './application/get-proposal-by-id.use-case';
import { ProposalQueryController } from './http/proposal-query.controller';

@Module({
  imports: [PrismaModule, GooglePlacesModule, StorageModule],
  controllers: [ProposalResponseController, ProposalsController, ProposalQueryController],
  providers: [
    CreateProposalUseCase,
    CreateProposalResponseUseCase,
    UpdateProposalResponseUseCase,
    GetProposalByIdUseCase,
    {
      provide: ProposalRepository,
      useClass: PrismaProposalRepository,
    },
    {
      provide: ProposalResponseRepository,
      useClass: PrismaProposalResponseRepository,
    },
    GetProposalByGroupUseCase,
    {
      provide: ProposalRepository,
      useClass: PrismaProposalRepository,
    },
  ],
  exports: [GetProposalByGroupUseCase],
})
export class ProposalsModule {}
