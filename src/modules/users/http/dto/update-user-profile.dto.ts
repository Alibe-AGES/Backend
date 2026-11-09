import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const MAX_NAME_LENGTH = 100;

const updateUserProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'O nome é obrigatório')
      .max(MAX_NAME_LENGTH, `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres`),
  })
  .strict();

export class UpdateUserProfileDto extends createZodDto(updateUserProfileSchema) {
  @ApiProperty({ minLength: 1, maxLength: MAX_NAME_LENGTH, example: 'Ana Beatriz Silva' })
  name!: string;
}
