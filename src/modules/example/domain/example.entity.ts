export interface ExampleProps {
  id: string;
  description: string;
  imageKey: string;
  createdAt: Date;
}

export class Example {
  readonly id: string;
  readonly description: string;
  readonly imageKey: string;
  readonly createdAt: Date;

  constructor(props: ExampleProps) {
    this.id = props.id;
    this.description = props.description;
    this.imageKey = props.imageKey;
    this.createdAt = props.createdAt;
  }
}
