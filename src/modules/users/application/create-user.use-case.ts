import { Injectable } from '@nestjs/common';

import { User } from '../domain/user.entity';
import { UserRepository } from '../domain/user.repository';
import { UsersEventsService } from './users-events.service';

export interface CreateUserInput {
  name: string;
  age: number;
}

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly events: UsersEventsService
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const user = new User(input);
    const createdUser = await this.users.create(user);

    this.events.publish('user.created', createdUser);

    return createdUser;
  }
}
