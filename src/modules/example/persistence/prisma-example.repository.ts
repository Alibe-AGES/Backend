import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Example } from '../domain/example.entity';
import { ExampleRepository, type CreateExampleData } from '../domain/example.repository';

@Injectable()
export class PrismaExampleRepository extends ExampleRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateExampleData): Promise<Example> {
    const example = await this.prisma.example.create({ data });
    return this.toDomain(example);
  }

  async findById(id: string): Promise<Example | null> {
    const example = await this.prisma.example.findUnique({ where: { id } });
    return example ? this.toDomain(example) : null;
  }

  private toDomain(data: {
    id: string;
    description: string;
    imageKey: string;
    createdAt: Date;
  }): Example {
    return new Example(data);
  }
}
