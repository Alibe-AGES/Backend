import { ApiProperty } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Mesmos limites configurados em `emailAndPassword` no Better Auth.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const updatePasswordSchema = z
  .object({
    password: z.string().min(1, 'A senha atual é obrigatória').max(MAX_PASSWORD_LENGTH),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `A nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`)
      .max(
        MAX_PASSWORD_LENGTH,
        `A nova senha deve ter no máximo ${MAX_PASSWORD_LENGTH} caracteres`
      ),
  })
  .strict();

export class UpdatePasswordDto extends createZodDto(updatePasswordSchema) {
  @ApiProperty({ format: 'password', description: 'Senha atual do usuário autenticado.' })
  password!: string;

  @ApiProperty({
    format: 'password',
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: MAX_PASSWORD_LENGTH,
    description: 'Nova senha. O backend armazena somente o hash.',
  })
  newPassword!: string;
}
