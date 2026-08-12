export interface ExampleProps {
  message: string;
}

export class Example {
  constructor(private readonly props: ExampleProps) {}

  get message(): string {
    return this.props.message;
  }
}
