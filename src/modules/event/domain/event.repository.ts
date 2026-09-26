import { StatusEnum } from '../../../../generated/prisma/enums';

export interface EventDetails {
  id: string;
  name: string;
  timeslot: Date;
  budgetStart: string;
  budgetEnd: string;
  status: StatusEnum;
  createdAt: Date;
  groupId: string;
  location: {
    id: string;
    description: string;
    manuallyCreated: boolean;
  };
  proposals: Array<{
    id: string;
    owner: {
      id: string;
      name: string;
      image: string;
    };
    responses: Array<{
      id: string;
      answer: string;
      createdAt: Date;
      user: {
        id: string;
        name: string;
        image: string;
      };
    }>;
    createdAt: Date;
  }>;
}

export abstract class EventRepository {
  abstract findUnique(eventId: string, userId: string): Promise<EventDetails | null>;
}
