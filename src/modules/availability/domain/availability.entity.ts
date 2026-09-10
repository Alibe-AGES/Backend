export interface AvailabilityProps {
  readonly id: string;
  readonly groupId: string;
  readonly userId: string;
  readonly date: Date;
  readonly timeslotStart?: Date | null;
  readonly timeslotEnd?: Date | null;
}

export class Availability {
  readonly id: string;
  readonly groupId: string;
  readonly userId: string;
  readonly date: Date;
  readonly timeslotStart: Date;
  readonly timeslotEnd: Date;

  constructor(props: AvailabilityProps) {
    this.id = props.id;
    this.groupId = props.groupId;
    this.userId = props.userId;
    this.date = props.date;
    this.timeslotStart = props.timeslotStart;
    this.timeslotEnd = props.timeslotEnd;
  }
}
