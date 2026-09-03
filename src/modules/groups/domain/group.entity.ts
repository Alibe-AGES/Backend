export interface GroupProps {
  id: string;
  name: string;
  imageKey?: string | undefined;
  createdAt: Date;
}

export class Group {
  readonly id: string;
  readonly name: string;
  readonly imageKey: string | null; 
  readonly createdAt: Date;

  constructor(props: GroupProps) {
    this.id = props.id;
    this.name = props.name;
    this.imageKey = props.imageKey;
    this.createdAt = props.createdAt;
  }
}
