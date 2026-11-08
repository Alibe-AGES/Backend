export interface PushNotificationRecipient {
  userId: string;
  pushToken: string;
}

export interface AttendanceReminderCandidate {
  eventId: string;
  eventName: string;
  groupId: string;
  recipients: PushNotificationRecipient[];
}

export abstract class EventNotificationRepository {
  abstract findGroupRecipients(
    groupId: string,
    excludedUserId?: string
  ): Promise<PushNotificationRecipient[]>;

  abstract findAttendanceReminderCandidates(
    start: Date,
    end: Date
  ): Promise<AttendanceReminderCandidate[]>;
}
