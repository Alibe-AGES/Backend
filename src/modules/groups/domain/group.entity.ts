export interface GroupProps {
  id: string;
  name: string;
<<<<<<< HEAD
  profilePic?: string | null;
=======
  profilePic: string | null;
>>>>>>> develop
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
