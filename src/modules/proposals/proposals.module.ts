import { Module } from '@nestjs/common';
import { GooglePlacesModule } from '../../infrastructure/api/google-places/google-places.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { CreateProposalUseCase } from './application/create-proposal.use-case';
import { ProposalsController } from './http/proposals.controller';
import { CreateProposalResponseUseCase } from './application/create-proposal-response.use-case';
import { UpdateProposalResponseUseCase } from './application/update-proposal-response.use-case';
import { ProposalResponseRepository } from './domain/proposal-response.repository';
import { ProposalResponseController } from './http/proposal-response.controller';
import { PrismaProposalResponseRepository } from './persistence/prisma-proposal-response.repository';

@Module({
  imports: [PrismaModule, EventsModule, GooglePlacesModule],
  controllers: [ProposalResponseController, ProposalsController],
  providers: [
    CreateProposalUseCase,
    CreateProposalResponseUseCase,
    UpdateProposalResponseUseCase,
    {
      provide: ProposalResponseRepository,
      useClass: PrismaProposalResponseRepository,
    },
  ],
})
export class ProposalsModule {}
