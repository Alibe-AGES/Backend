export type CalendarEventStatus = 'pending' | 'confirmed' | 'declined';

export interface CalendarEventData {
  id: string;
  timeslot: Date;
  status: CalendarEventStatus;
  proposalIds: string[];
}

export interface CalendarAvailabilityData {
  userId: string;
  date: Date;
}

export interface GroupCalendarData {
  userIsMember: boolean;
  memberIds: string[];
  events: CalendarEventData[];
  availabilities: CalendarAvailabilityData[];
}

export interface FindGroupCalendarDataInput {
  groupId: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
}

export abstract class CalendarRepository {
  abstract findGroupCalendarData(
    input: FindGroupCalendarDataInput
  ): Promise<GroupCalendarData | null>;
}
