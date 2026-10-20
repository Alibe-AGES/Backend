export interface PushNotificationMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export abstract class PushNotificationQueue {
  abstract publish(message: PushNotificationMessage): Promise<void>;
}
