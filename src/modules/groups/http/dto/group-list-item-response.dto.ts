import { ApiProperty } from '@nestjs/swagger';

export class GroupListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Amigos da faculdade' })
  name!: string;

  @ApiProperty({ example: 'https://images.example.com/groups/faculdade.jpg', nullable: true })
  profilePic!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}
