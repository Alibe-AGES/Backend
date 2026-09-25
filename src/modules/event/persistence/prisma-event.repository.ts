import { PrismaService } from "src/infrastructure/prisma/prisma.service";
import { EventDetails, EventRepository } from "../domain/event.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class PrismaEventRepository extends EventRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }
    
    async findById(id: string): Promise<EventDetails | null> {
        const event = await this.prisma.event.findFirst({
            where: { id },
            select: {
                id: true,
                name: true,
                timeslot: true,
                budgetStart: true,
                budgetEnd: true,
                status: true,
                createdAt: true,
                groupId: true,
                locationId: true,
                location: {
                    select: {
                        id: true,
                        description: true,
                        manuallyCreated: true,
                    },
                },
                proposals: {
                    select: {
                        id: true,
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                profilePic: true,
                            },
                        },
                        responses: {
                            select: {
                                id: true,
                                answer: true,
                                createdAt: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        profilePic: true,
                                    },
                                },
                            },
                        },
                        createdAt: true,
                    },
                },
            },
        });

        if (!event) {
            return null;
        }

        return {
            id: event.id,
            name: event.name,
            timeslot: event.timeslot,
            budgetStart: event.budgetStart.toFixed(2),
            budgetEnd: event.budgetEnd.toFixed(2),
            status: event.status,
            createdAt: event.createdAt,
            groupId: event.groupId,
            location: event.location 
            ? {
                id: event.location.id,
                description: event.location.description,
                manuallyCreated: event.location.manuallyCreated
            } : null,  
            proposals: event.proposals.map((proposal) => ({
                id: proposal.id,
                owner: { 
                    id: proposal.owner.id,
                    name: proposal.owner.name,
                    image: proposal.owner.profilePic ?? '', 
                },
                responses: proposal.responses.map((response) => ({
                    id: response.id,
                    answer: response.answer,
                    createdAt: response.createdAt,
                    user: { 
                        id: response.user.id,
                        name: response.user.name,
                        image: response.user.profilePic ?? '', 
                    },
                })),
                createdAt: proposal.createdAt
            })),
        };
    }
}
