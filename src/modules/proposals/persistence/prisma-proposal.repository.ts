import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { ProposalRepository } from '../domain/proposal.entity.repository';
import { ProposalDto } from '../http/dto/proposal-dto';
import { AnswerEnum } from '../../../../generated/prisma/enums';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaProposalRepository extends ProposalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProposalsByGroup(groupId: string, userId: string): Promise<ProposalDto[]> {
    const proposals = await this.prisma.proposal.findMany({
      where: {
        event: {
          groupId: groupId,
          group: {
            users: {
              some: {
                userId,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          timeslot: 'asc',
        },
      },
      include: {
        event: {
          include: {
            location: true,
          },
        },
        owner: true,
        responses: true,
      },
    });

    return proposals.map((p) => {
      const responsesCount = p.responses.reduce(
        (acc, response) => {
          if (response.answer === AnswerEnum.yes) acc.yes++;
          else if (response.answer === AnswerEnum.no) acc.no++;
          else if (response.answer === AnswerEnum.pending) acc.pending++;
          return acc;
        },
        { yes: 0, no: 0, pending: 0 }
      );

      const userResponse = p.responses.find((resp) => resp.userId === userId);
      const myAnswer = userResponse ? userResponse.answer : AnswerEnum.pending;

      return {
        id: p.id,
        createdAt: p.createdAt,
        owner: {
          id: p.owner.id,
          name: p.owner.name,
          image: p.owner.profilePic ?? null,
        },
        event: {
          id: p.event.id,
          name: p.event.name ?? null,
          date: p.event.timeslot ? p.event.timeslot.toISOString().split('T')[0] : null,
          time: p.event.timeslot
            ? p.event.timeslot.toISOString().split('T')[1].substring(0, 5)
            : null,
          image: p.event.image ?? null,
          budgetStart: p.event.budgetStart ? p.event.budgetStart.toString() : null,
          budgetEnd: p.event.budgetEnd ? p.event.budgetEnd.toString() : null,
          status: p.event.status,
          groupId: p.event.groupId,
          location: null,
          proposal: null,
          createdAt: p.event.createdAt ?? null,
          updatedAt: p.event.updatedAt,
        },
        location: p.event.location
          ? {
              id: p.event.location.id,
              description: p.event.location.description ?? null,
              manuallyCreated: p.event.location.manuallyCreated ?? null,
            }
          : null,
        responses: responsesCount,
        myAnswer,
      };
    });
  }
}
