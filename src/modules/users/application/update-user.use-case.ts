import { Injectable, NotFoundException } from '@nestjs/common';

import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { UsersEventsService } from './users-events.service';

export interface UpdateUserInput {
  id: string;
  name?: string;
  age?: number;
}

@Injectable()
export class UpdateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly events: UsersEventsService
  ) {}

  async execute(input: UpdateUserInput): Promise<User> {
    const currentUser = await this.users.findById(input.id);

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    const user = new User({
      id: currentUser.id,
      name: input.name ?? currentUser.name,
      age: input.age ?? currentUser.age,
      createdAt: currentUser.createdAt,
      updatedAt: new Date(),
    });

    const updatedUser = await this.users.update(user);

    this.events.publish('user.updated', updatedUser);

    return updatedUser;
  }
}
