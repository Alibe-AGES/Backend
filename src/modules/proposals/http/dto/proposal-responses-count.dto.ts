import { ApiProperty } from '@nestjs/swagger';

export class ProposalResponsesCount {
  @ApiProperty()
  yes!: number;

  @ApiProperty()
  no!: number;

  @ApiProperty()
  pending!: number;
}
