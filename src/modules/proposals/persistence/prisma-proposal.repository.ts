import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  type CreatedSuggestion,
  type CreateSuggestionData,
  ProposalRepository,
  type StoredCatalogLocation,
} from '../domain/proposal.repository';
import { registerMatchIfComplete } from './proposal-match.transaction';

const locationSelect = { id: true, description: true, address: true };

@Injectable()
export class PrismaProposalRepository extends ProposalRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findGroupMembership(groupId: string, userId: string): Promise<boolean | null> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { users: { where: { userId }, select: { userId: true }, take: 1 } },
    });

    return group ? group.users.length > 0 : null;
  }

  findCatalogLocation(externalId: string): Promise<StoredCatalogLocation | null> {
    return this.prisma.location.findFirst({
      where: { externalId, manuallyCreated: false },
      select: locationSelect,
    });
  }

  createSuggestion({
    location: catalogLocation,
    ...data
  }: CreateSuggestionData): Promise<CreatedSuggestion> {
    return this.prisma.$transaction(async (transaction) => {
      const location =
        (await transaction.location.findFirst({
          where: { externalId: catalogLocation.externalId, manuallyCreated: false },
          select: locationSelect,
        })) ??
        (await transaction.location.create({
          data: { ...catalogLocation, manuallyCreated: false },
          select: locationSelect,
        }));

      const proposal = await transaction.proposal.create({
        data: {
          id: data.id,
          type: 'suggestion',
          groupId: data.groupId,
          ownerId: data.ownerId,
          name: data.name,
          locationId: location.id,
          createdAt: data.createdAt,
        },
        select: {
          id: true,
          groupId: true,
          name: true,
          createdAt: true,
          owner: { select: { id: true, name: true, profilePic: true } },
        },
      });

      const ownerResponse = await transaction.proposalResponse.create({
        data: {
          proposalId: proposal.id,
          userId: data.ownerId,
          answer: 'yes',
          createdAt: data.createdAt,
        },
        select: { answer: true },
      });

      const matched = await registerMatchIfComplete(transaction, proposal.id, data.createdAt);

      return {
        id: proposal.id,
        type: 'suggestion',
        groupId: proposal.groupId,
        name: data.name,
        createdAt: proposal.createdAt,
        owner: {
          id: proposal.owner.id,
          name: proposal.owner.name,
          image: proposal.owner.profilePic,
        },
        location,
        myAnswer: ownerResponse.answer,
        matched,
      };
    });
  }
}
