import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  type ActiveSuggestion,
  type CreatedSuggestion,
  type CreateSuggestionData,
  ProposalRepository,
  type StoredProposalLocation,
  type NewSuggestionLocation,
  type ProposalAnswerCount,
  type ProposalDetailsAccess,
} from '../domain/proposal.repository';
import { registerMatchIfComplete } from './proposal-match.transaction';

const locationSelect = {
  id: true,
  externalId: true,
  name: true,
  description: true,
  address: true,
  openingHours: true,
  rating: true,
  phoneNumber: true,
  website: true,
  priceStart: true,
  priceEnd: true,
  priceCurrency: true,
  image: true,
  manuallyCreated: true,
} as const;

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

  async findCatalogLocation(externalId: string): Promise<StoredProposalLocation | null> {
    const location = await this.prisma.location.findUnique({
      where: { externalId, manuallyCreated: false },
      select: locationSelect,
    });
    return location ? this.toStoredLocation(location) : null;
  }

  async findLocationById(id: string): Promise<StoredProposalLocation | null> {
    const location = await this.prisma.location.findUnique({
      where: { id },
      select: locationSelect,
    });
    return location ? this.toStoredLocation(location) : null;
  }

  async findDetails(id: string, userId: string): Promise<ProposalDetailsAccess | null> {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        groupId: true,
        eventId: true,
        name: true,
        suggestionDate: true,
        createdAt: true,
        matchedAt: true,
        owner: { select: { id: true, name: true, profilePic: true } },
        location: { select: locationSelect },
        event: { select: { location: { select: locationSelect } } },
        responses: {
          where: { userId },
          select: { answer: true },
          take: 1,
        },
        group: {
          select: {
            users: { where: { userId }, select: { userId: true }, take: 1 },
          },
        },
      },
    });
    if (!proposal) return null;

    const location = proposal.location ?? proposal.event?.location ?? null;
    return {
      proposal: {
        id: proposal.id,
        type: proposal.type,
        groupId: proposal.groupId,
        eventId: proposal.eventId,
        name: proposal.name,
        suggestionDate: proposal.suggestionDate,
        createdAt: proposal.createdAt,
        matchedAt: proposal.matchedAt,
        owner: {
          id: proposal.owner.id,
          name: proposal.owner.name,
          image: proposal.owner.profilePic,
        },
        location: location ? this.toStoredLocation(location) : null,
        myAnswer: proposal.responses[0]?.answer ?? null,
      },
      userIsMember: proposal.group.users.length > 0,
    };
  }

  async findActiveSuggestions(groupId: string, userId: string): Promise<ActiveSuggestion[]> {
    const suggestions = await this.prisma.proposal.findMany({
      where: { groupId, type: 'suggestion', matchedAt: null, responses: { none: { userId } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        groupId: true,
        name: true,
        suggestionDate: true,
        createdAt: true,
        owner: { select: { id: true, name: true, profilePic: true } },
        location: { select: locationSelect },
        responses: { select: { answer: true } },
      },
    });

    return suggestions.map((suggestion) => {
      const responses: ProposalAnswerCount = { yes: 0, no: 0, pending: 0 };
      suggestion.responses.forEach(({ answer }) => responses[answer]++);

      return {
        id: suggestion.id,
        type: 'suggestion',
        groupId: suggestion.groupId,
        name: suggestion.name,
        suggestionDate: suggestion.suggestionDate,
        createdAt: suggestion.createdAt,
        owner: {
          id: suggestion.owner.id,
          name: suggestion.owner.name,
          image: suggestion.owner.profilePic,
        },
        location: suggestion.location ? this.toStoredLocation(suggestion.location) : null,
        responses,
      };
    });
  }

  createSuggestion({
    location: catalogLocation,
    ...data
  }: CreateSuggestionData): Promise<CreatedSuggestion> {
    return this.prisma.$transaction(async (transaction) => {
      const location =
        catalogLocation.kind === 'existing'
          ? await transaction.location.findUniqueOrThrow({
              where: { id: catalogLocation.id },
              select: locationSelect,
            })
          : await this.createLocation(transaction, catalogLocation.value);

      const proposal = await transaction.proposal.create({
        data: {
          id: data.id,
          type: 'suggestion',
          groupId: data.groupId,
          ownerId: data.ownerId,
          name: data.name,
          suggestionDate: data.suggestionDate,
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
        suggestionDate: data.suggestionDate,
        createdAt: proposal.createdAt,
        owner: {
          id: proposal.owner.id,
          name: proposal.owner.name,
          image: proposal.owner.profilePic,
        },
        location: this.toStoredLocation(location),
        myAnswer: ownerResponse.answer,
        matched,
      };
    });
  }

  private createLocation(transaction: Prisma.TransactionClient, location: NewSuggestionLocation) {
    const data = {
      id: location.id,
      externalId: location.externalId,
      name: location.name,
      description: location.description,
      address: location.address,
      openingHours: location.openingHours,
      rating: location.rating,
      phoneNumber: location.phoneNumber,
      website: location.website,
      priceStart: location.priceRange.start,
      priceEnd: location.priceRange.end,
      priceCurrency: location.priceRange.currencyCode,
      image: location.image,
      manuallyCreated: location.manuallyCreated,
    };

    return location.externalId
      ? transaction.location.upsert({
          where: { externalId: location.externalId },
          update: {},
          create: data,
          select: locationSelect,
        })
      : transaction.location.create({ data, select: locationSelect });
  }

  private toStoredLocation(location: {
    id: string;
    externalId: string | null;
    name: string | null;
    description: string | null;
    address: string | null;
    openingHours: string[];
    rating: number | null;
    phoneNumber: string | null;
    website: string | null;
    priceStart: { toFixed(fractionDigits: number): string } | null;
    priceEnd: { toFixed(fractionDigits: number): string } | null;
    priceCurrency: string | null;
    image: string | null;
    manuallyCreated: boolean | null;
  }): StoredProposalLocation {
    return {
      id: location.id,
      externalId: location.externalId,
      name: location.name,
      description: location.description,
      address: location.address,
      openingHours: location.openingHours,
      rating: location.rating,
      phoneNumber: location.phoneNumber,
      website: location.website,
      priceRange: {
        start: location.priceStart?.toFixed(2) ?? null,
        end: location.priceEnd?.toFixed(2) ?? null,
        currencyCode: location.priceCurrency,
      },
      image: location.image,
      manuallyCreated: location.manuallyCreated,
    };
  }
}
