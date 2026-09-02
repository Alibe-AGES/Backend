import { ApiProperty } from '@nestjs/swagger';

export class GroupNextEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jantar da turma' })
  name!: string;

  @ApiProperty({ format: 'date-time' })
  timeslot!: Date;

  @ApiProperty({ enum: ['pending', 'confirmed', 'declined'], example: 'confirmed' })
  status!: 'pending' | 'confirmed' | 'declined';
}
