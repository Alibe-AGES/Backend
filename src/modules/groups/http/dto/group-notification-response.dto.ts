import { ApiProperty } from '@nestjs/swagger';
import type { GroupNotificationType } from '../../domain/group-notification.repository';

export class GroupNotificationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['match', 'createdEvent'], example: 'createdEvent' })
  type!: GroupNotificationType;

  @ApiProperty({ example: 'Ana Souza criou o evento "Cinema" para o dia 18/10/2026.' })
  message!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'uuid', nullable: true })
  eventId!: string | null;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    description: 'Local da sugestão que deu match; preenchido nas notificações do tipo `match`.',
  })
  locationId!: string | null;
}

export class GroupNotificationPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 7 })
  limit!: number;

  @ApiProperty({ example: 18 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PaginatedGroupNotificationsResponseDto {
  @ApiProperty({ type: GroupNotificationResponseDto, isArray: true })
  items!: GroupNotificationResponseDto[];

  @ApiProperty({ type: GroupNotificationPaginationDto })
  pagination!: GroupNotificationPaginationDto;
}
