import { Module } from '@nestjs/common';
import { GooglePlacesModule } from '../../infrastructure/api/google-places/google-places.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { CreateProposalUseCase } from './application/create-proposal.use-case';
import { ProposalsController } from './http/proposals.controller';
import { CreateProposalResponseUseCase } from './application/create-proposal-response.use-case';
import { UpdateProposalResponseUseCase } from './application/update-proposal-response.use-case';
import { ProposalRepository } from './domain/proposal.repository';
import { ProposalResponseRepository } from './domain/proposal-response.repository';
import { ProposalResponseController } from './http/proposal-response.controller';
import { PrismaProposalRepository } from './persistence/prisma-proposal.repository';
import { PrismaProposalResponseRepository } from './persistence/prisma-proposal-response.repository';

@Module({
  imports: [PrismaModule, GooglePlacesModule],
  controllers: [ProposalResponseController, ProposalsController],
  providers: [
    CreateProposalUseCase,
    CreateProposalResponseUseCase,
    UpdateProposalResponseUseCase,
    {
      provide: ProposalRepository,
      useClass: PrismaProposalRepository,
    },
    {
      provide: ProposalResponseRepository,
      useClass: PrismaProposalResponseRepository,
    },
  ],
})
export class ProposalsModule {}
