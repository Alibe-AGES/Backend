import { Injectable } from '@nestjs/common';
import { CalendarRepository, type GroupCalendarData } from '../domain/calendar.repository';

export interface GetGroupCalendarInput {
  groupId: string;
  userId: string;
  month: number;
  year: number;
}

export interface GroupCalendarDay {
  date: string;
  scheduledEventIds: string[];
  proposalIds: string[];
  availableUserIds: string[];
  completedEventIds: string[];
  allUsersAvailable: boolean;
}

interface MutableCalendarDay {
  scheduledEventIds: Set<string>;
  proposalIds: Set<string>;
  availableUserIds: Set<string>;
  completedEventIds: Set<string>;
}

export class InvalidCalendarPeriodError extends Error {}

export class CalendarGroupNotFoundError extends Error {}

export class CalendarAccessDeniedError extends Error {}

@Injectable()
export class GetGroupCalendarUseCase {
  constructor(private readonly calendar: CalendarRepository) {}

  async execute(input: GetGroupCalendarInput): Promise<GroupCalendarDay[]> {
    this.validatePeriod(input.month, input.year);

    const periodStart = new Date(Date.UTC(input.year, input.month - 1, 1));
    const periodEnd = new Date(Date.UTC(input.year, input.month, 1));
    const calendar = await this.calendar.findGroupCalendarData({
      groupId: input.groupId,
      userId: input.userId,
      periodStart,
      periodEnd,
    });

    if (!calendar) {
      throw new CalendarGroupNotFoundError('Group not found');
    }

    if (!calendar.userIsMember) {
      throw new CalendarAccessDeniedError('User does not belong to this group');
    }

    return this.groupByDay(calendar);
  }

  private groupByDay(calendar: GroupCalendarData): GroupCalendarDay[] {
    const days = new Map<string, MutableCalendarDay>();
    const memberIds = new Set(calendar.memberIds);

    for (const event of calendar.events) {
      if (event.status === 'declined') {
        continue;
      }

      const date = this.dateOnly(event.timeslot);

      if (event.status === 'confirmed') {
        const day = this.getOrCreateDay(days, date);
        const target =
          event.timeslot.getTime() < Date.now() ? day.completedEventIds : day.scheduledEventIds;

        target.add(event.id);
        continue;
      }

      if (event.proposalIds.length > 0) {
        const day = this.getOrCreateDay(days, date);
        event.proposalIds.forEach((proposalId) => day.proposalIds.add(proposalId));
      }
    }

    for (const availability of calendar.availabilities) {
      if (!memberIds.has(availability.userId)) {
        continue;
      }

      const date = this.dateOnly(availability.date);
      this.getOrCreateDay(days, date).availableUserIds.add(availability.userId);
    }

    return [...days.entries()]
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .map(([date, day]) => {
        const availableUserIds = [...day.availableUserIds].sort();

        return {
          date,
          scheduledEventIds: [...day.scheduledEventIds].sort(),
          proposalIds: [...day.proposalIds].sort(),
          availableUserIds,
          completedEventIds: [...day.completedEventIds].sort(),
          allUsersAvailable:
            memberIds.size > 0 &&
            [...memberIds].every((memberId) => day.availableUserIds.has(memberId)),
        };
      });
  }

  private getOrCreateDay(days: Map<string, MutableCalendarDay>, date: string): MutableCalendarDay {
    const existingDay = days.get(date);

    if (existingDay) {
      return existingDay;
    }

    const day = {
      scheduledEventIds: new Set<string>(),
      proposalIds: new Set<string>(),
      availableUserIds: new Set<string>(),
      completedEventIds: new Set<string>(),
    };

    days.set(date, day);
    return day;
  }

  private dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private validatePeriod(month: number, year: number): void {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new InvalidCalendarPeriodError('Month must be an integer between 1 and 12');
    }

    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      throw new InvalidCalendarPeriodError('Year must be a four-digit integer');
    }
  }
}
