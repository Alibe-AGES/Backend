export interface EventLocation {
  id: string;
  description: string | null;
  manuallyCreated: boolean | null;
}

export interface EventProposal {
  id: string;
  ownerId: string;
}

export interface EventProps {
  id: string;
  name: string | null;
  timeslot: Date | null;
  image: string | null;
  budgetStart: string | null;
  budgetEnd: string | null;
  status: string;
  groupId: string;
  location: EventLocation;
  proposals: EventProposal[];
  createdAt: Date | null;
  updatedAt: Date;
}

export class Event {
  readonly id: string;
  readonly name: string | null;
  readonly timeslot: Date | null;
  readonly image: string | null;
  readonly budgetStart: string | null;
  readonly budgetEnd: string | null;
  readonly status: string;
  readonly groupId: string;
  readonly location: EventLocation;
  readonly proposals: EventProposal[];
  readonly createdAt: Date | null;
  readonly updatedAt: Date;

  constructor(props: EventProps) {
    this.id = props.id;
    this.name = props.name;
    this.timeslot = props.timeslot;
    this.image = props.image;
    this.budgetStart = props.budgetStart;
    this.budgetEnd = props.budgetEnd;
    this.status = props.status;
    this.groupId = props.groupId;
    this.location = props.location;
    this.proposals = props.proposals;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
