import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ProposalResponse, type UserProposalAnswer } from '../domain/proposal-response.entity';
import {
  type CreateProposalResponseData,
  type EventProposalContext,
  ProposalResponseAlreadyExistsError,
  ProposalResponseRepository,
} from '../domain/proposal-response.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class PrismaProposalResponseRepository extends ProposalResponseRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findEventProposalContext(
    eventId: string,
    userId: string
  ): Promise<EventProposalContext | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        proposals: { select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        group: { select: { users: { where: { userId }, select: { userId: true }, take: 1 } } },
      },
    });

    if (!event) {
      return null;
    }

    return {
      proposalId: event.proposals[0]?.id ?? null,
      isGroupMember: event.group.users.length > 0,
    };
  }

  async create(data: CreateProposalResponseData): Promise<ProposalResponse> {
    try {
      const record = await this.prisma.proposalResponse.create({ data });
      return new ProposalResponse(record);
    } catch (error) {
      if (isPrismaError(error, UNIQUE_CONSTRAINT_VIOLATION)) {
        throw new ProposalResponseAlreadyExistsError('O usuário já respondeu esta proposta');
      }
      throw error;
    }
  }

  async updateAnswer(
    proposalId: string,
    userId: string,
    answer: UserProposalAnswer
  ): Promise<ProposalResponse | null> {
    try {
      const record = await this.prisma.proposalResponse.update({
        where: { proposalId_userId: { proposalId, userId } },
        data: { answer },
      });
      return new ProposalResponse(record);
    } catch (error) {
      if (isPrismaError(error, RECORD_NOT_FOUND)) {
        return null;
      }
      throw error;
    }
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}
