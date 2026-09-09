import { Injectable } from "@nestjs/common";
import { AvailabilityRepository, CreateAvailabilityData } from "../domain/availability.repository";
import { Availability } from "../domain/availability.entity";
import { PrismaService } from "src/infrastructure/prisma/prisma.service";

@Injectable()
export class PrismaAvailabilityRepository extends AvailabilityRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }
    
    async create(data: CreateAvailabilityData): Promise<Availability> {
        console.log("DATA.DATE: " + data.date); 

        const availability = await this.prisma.availability.create({ 
            data: {
                group: {
                    connect: { id: data.groupId },
                },
                user: {
                    connect: { id: data.userId },
                },
                date: data.date,
                timeslotStart: data.timeslotStart ?? null,
                timeslotEnd: data.timeslotEnd ?? null,
            },
        });
        return this.toDomain(availability);
    }

    private toDomain(data: {
        id: string,
        groupId: string,
        userId: string,
        date: Date,
        timeslotStart?: Date | null,
        timeslotEnd?: Date | null
    }): Availability {
        return new Availability(data);
    }
}