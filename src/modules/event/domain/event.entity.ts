import { StatusEnum } from '../../../../generated/prisma/enums';

export interface EventProps {
  readonly id: string;
  readonly name: string;
  readonly timeslot: Date;
  readonly image: string;
  readonly budgetStart: number;
  readonly budgetEnd: number;
  readonly status: StatusEnum;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly groupId: string;
  readonly locationId: string;
}

export class Event {
  readonly id: string;
  readonly name: string;
  readonly timeslot: Date;
  readonly image: string;
  readonly budgetStart: number;
  readonly budgetEnd: number;
  readonly status: StatusEnum;
  readonly createdAt: Date;
  readonly groupId: string;
  readonly locationId: string;

  constructor(props: EventProps) {
    this.id = props.id;
    this.name = props.name;
    this.timeslot = props.timeslot;
    this.image = props.image;
    this.budgetStart = props.budgetStart;
    this.budgetEnd = props.budgetEnd;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.groupId = props.groupId;
    this.locationId = props.locationId;
  }
}
