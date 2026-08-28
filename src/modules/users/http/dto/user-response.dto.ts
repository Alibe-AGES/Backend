import { ApiProperty } from '@nestjs/swagger';

import { User } from '../../domain/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '2bcbaf36-22af-48ea-a4db-46e31c222f80' })
  id!: string;

  @ApiProperty({ example: 'Pedro' })
  name!: string;

  @ApiProperty({ example: 22 })
  age!: number;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-28T12:00:00.000Z' })
  updatedAt!: Date;

  static fromDomain(user: User): UserResponseDto {
    return {
      id: user.id as string,
      name: user.name,
      age: user.age,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
