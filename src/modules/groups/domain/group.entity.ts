export interface GroupProps {
  id: string;
  name: string;
  profilePic: string | null;
  createdAt: Date;
}

export class Group {
  readonly id: string;
  readonly name: string;
  readonly profilePic: string | null;
  readonly createdAt: Date;

  constructor(props: GroupProps) {
    this.id = props.id;
    this.name = props.name;
    this.profilePic = props.profilePic;
    this.createdAt = props.createdAt;
  }
}
