export interface ExampleProps {
  message: string;
}

export class Example {
  readonly message: string;

  constructor(props: ExampleProps) {
    this.message = props.message;
  }
}
