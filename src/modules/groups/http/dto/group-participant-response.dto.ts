import { ApiProperty } from '@nestjs/swagger';

export class GroupParticipantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Souza' })
  name!: string;

  @ApiProperty({ example: 'https://images.example.com/users/ana.jpg', nullable: true })
  profilePic!: string | null;
}
