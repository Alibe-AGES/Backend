import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from '../../../events/http/dto/owner-details-response.dto';
import { ProposalLocationResponseDto } from './created-proposal-response.dto';

export class ProposalAnswerCountResponseDto {
  @ApiProperty({ example: 2 })
  yes!: number;

  @ApiProperty({ example: 1 })
  no!: number;

  @ApiProperty({ example: 0 })
  pending!: number;
}

export class ActiveProposalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['suggestion'] })
  type!: 'suggestion';

  @ApiProperty({ format: 'uuid' })
  groupId!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Restaurante Penne' })
  name!: string | null;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: OwnerResponseDto })
  owner!: OwnerResponseDto;

  @ApiProperty({ type: ProposalLocationResponseDto, nullable: true })
  location!: ProposalLocationResponseDto | null;

  @ApiProperty({
    type: ProposalAnswerCountResponseDto,
    description: 'Quantidade de respostas registradas por tipo.',
  })
  responses!: ProposalAnswerCountResponseDto;
}
