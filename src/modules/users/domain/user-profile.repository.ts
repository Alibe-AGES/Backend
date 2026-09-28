export interface CurrentUserSummary {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  image: string | null;
  completedEvents: number;
  eventsInDecision: number;
}

export abstract class UserProfileRepository {
  abstract findCurrentUserSummary(userId: string, now: Date): Promise<CurrentUserSummary | null>;
}
