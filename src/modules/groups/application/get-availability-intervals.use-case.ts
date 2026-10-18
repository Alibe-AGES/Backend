import { Injectable } from '@nestjs/common';
import { type GroupAvailabilitiesByDate, GroupRepository } from '../domain/group.repository';

export class GroupNotFoundError extends Error {}
export class AvailabilityAccessDeniedError extends Error {}
export class InvalidAvailabilityDateError extends Error {}

@Injectable()
export class GetAvailabilityIntervalsUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(
    groupId: string,
    date: unknown,
    userId: string
  ): Promise<GroupAvailabilitiesByDate> {
    if (!isValidDate(date)) {
      throw new InvalidAvailabilityDateError('Formato inválido de data');
    }

    const membership = await this.groups.findMembership(groupId, userId);
    if (membership === null) {
      throw new GroupNotFoundError('Grupo não encontrado');
    }
    if (!membership) {
      throw new AvailabilityAccessDeniedError('O usuário não pertence ao grupo');
    }

    const availabilities = await this.groups.findAvailabilitiesByDate(groupId, date, userId);

    if (!availabilities) {
      throw new GroupNotFoundError('Grupo não encontrado');
    }

    return {
      ...availabilities,
      users: [
        ...availabilities.users.filter((user) => user.id === userId),
        ...availabilities.users.filter((user) => user.id !== userId),
      ],
    };
  }
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
