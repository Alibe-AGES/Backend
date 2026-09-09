export interface GroupInviteLinkProps {
  id: string;
  token: string;
  validity: Date;
  createdAt: Date;
  groupId: string;
}

export class GroupInviteLink {
  readonly id: string;
  readonly token: string;
  readonly validity: Date;
  readonly createdAt: Date;
  readonly groupId: string;

  constructor(props: GroupInviteLinkProps) {
    this.id = props.id;
    this.token = props.token;
    this.validity = props.validity;
    this.createdAt = props.createdAt;
    this.groupId = props.groupId;
  }

  isExpired(referenceDate: Date): boolean {
    return this.validity.getTime() <= referenceDate.getTime();
  }
}
