export interface UserProps {
  id?: string;
  name: string;
  age: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User {
  readonly id?: string;
  readonly name: string;
  readonly age: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    const name = props.name.trim();

    if (!name) {
      throw new Error('User name is required');
    }

    if (!Number.isInteger(props.age) || props.age < 0 || props.age > 150) {
      throw new Error('User age must be an integer between 0 and 150');
    }

    this.id = props.id;
    this.name = name;
    this.age = props.age;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}
