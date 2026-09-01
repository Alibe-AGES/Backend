import { ApiProperty } from '@nestjs/swagger';
import { GroupNextEventResponseDto } from './group-next-event-response.dto';
import { GroupParticipantResponseDto } from './group-participant-response.dto';

export class GroupDetailsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Amigos da faculdade' })
  name!: string;

  @ApiProperty({ example: 'https://images.example.com/groups/faculdade.jpg', nullable: true })
  profilePic!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: () => GroupParticipantResponseDto, isArray: true })
  participants!: GroupParticipantResponseDto[];

  @ApiProperty({ type: () => GroupNextEventResponseDto, nullable: true })
  nextEvent!: GroupNextEventResponseDto | null;
}
