import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { CreateProposalResponseUseCase } from './application/create-proposal-response.use-case';
import { UpdateProposalResponseUseCase } from './application/update-proposal-response.use-case';
import { ProposalResponseRepository } from './domain/proposal-response.repository';
import { ProposalResponseController } from './http/proposal-response.controller';
import { PrismaProposalResponseRepository } from './persistence/prisma-proposal-response.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ProposalResponseController],
  providers: [
    CreateProposalResponseUseCase,
    UpdateProposalResponseUseCase,
    {
      provide: ProposalResponseRepository,
      useClass: PrismaProposalResponseRepository,
    },
  ],
})
export class ProposalsModule {}
