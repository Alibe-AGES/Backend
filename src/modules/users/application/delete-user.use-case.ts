import { Injectable, NotFoundException } from '@nestjs/common';

import { UserRepository } from '../domain/user.repository';
import { UsersEventsService } from './users-events.service';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly events: UsersEventsService
  ) {}

  async execute(id: string): Promise<void> {
    const user = await this.users.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.users.delete(id);
    this.events.publish('user.deleted', user);
  }
}
