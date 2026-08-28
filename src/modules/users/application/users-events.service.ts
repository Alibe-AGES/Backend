import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

import { User } from '../domain/user.entity';

export type UserEventType = 'user.created' | 'user.updated' | 'user.deleted';

export interface UserEventData {
  type: UserEventType;
  user: User;
  occurredAt: string;
}

@Injectable()
export class UsersEventsService {
  private readonly subject = new Subject<MessageEvent>();

  publish(type: UserEventType, user: User): void {
    const data: UserEventData = {
      type,
      user,
      occurredAt: new Date().toISOString(),
    };

    this.subject.next({ type, data });
  }

  stream(): Observable<MessageEvent> {
    return this.subject.asObservable();
  }
}
