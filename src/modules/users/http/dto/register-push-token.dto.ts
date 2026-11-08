import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const EXPO_PUSH_TOKEN_PATTERN = /^(ExponentPushToken|ExpoPushToken)\[[^\]\s]+\]$/;

const registerPushTokenSchema = z
  .object({
    token: z
      .string()
      .trim()
      .max(255)
      .regex(EXPO_PUSH_TOKEN_PATTERN, 'Token do Expo Push Service inválido'),
  })
  .strict();

export class RegisterPushTokenDto extends createZodDto(registerPushTokenSchema) {}
