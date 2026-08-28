import { Injectable } from '@nestjs/common';

import { User as PrismaUser } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma.service';
import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(user: User): Promise<User> {
    const createdUser = await this.prisma.user.create({
      data: {
        name: user.name,
        age: user.age,
      },
    });

    return this.toDomain(createdUser);
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });

    return users.map((user) => this.toDomain(user));
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.toDomain(user) : null;
  }

  async update(user: User): Promise<User> {
    const updatedUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: user.name,
        age: user.age,
      },
    });

    return this.toDomain(updatedUser);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private toDomain(user: PrismaUser): User {
    return new User({
      id: user.id,
      name: user.name,
      age: user.age,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }
}
