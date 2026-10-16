import { ApiProperty } from '@nestjs/swagger';
import { OwnerResponseDto } from '../../../../../src/modules/events/http/dto/owner-details-response.dto';
import { EventResponseDto } from '../../../../../src/modules/events/http/dto/event-response.dto';
import { LocationResponseDto } from '../../../../../src/modules/events/http/dto/location-response.dto';
import { AnswerEnum } from '../../../../../generated/prisma/enums';
import { ProposalResponsesCount } from './proposal-responses-count.dto';

export class ProposalDto {
  @ApiProperty({ format: 'uuid', example: '66666666-6666-4666-8666-666666666666' })
  id!: string;

  @ApiProperty({ type: Date, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: OwnerResponseDto })
  owner!: OwnerResponseDto;

  @ApiProperty({ type: EventResponseDto })
  event!: EventResponseDto;

  @ApiProperty({ type: LocationResponseDto })
  location!: LocationResponseDto;

  @ApiProperty({ type: ProposalResponsesCount })
  responses!: ProposalResponsesCount;

  @ApiProperty()
  myAnswer: AnswerEnum;
}
