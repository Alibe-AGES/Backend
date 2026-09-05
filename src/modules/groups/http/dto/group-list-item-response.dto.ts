import { ApiProperty } from '@nestjs/swagger';

export class GroupListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Amigos da faculdade' })
  name!: string;

  @ApiProperty({
    example: 'https://images.example.com/groups/faculdade.jpg',
    nullable: true,
    required: false,
  })
  profilePic!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static fromEntity(
    group: { id: string; name: string; imageKey: string },
    createdAt: Date = new Date()
  ): GroupListItemResponseDto {
    const dto = new GroupListItemResponseDto();
    dto.id = group.id;
    dto.name = group.name;
    dto.profilePic = group.imageKey ? group.imageKey : null;
    dto.createdAt = createdAt;
    return dto;
  }
}
