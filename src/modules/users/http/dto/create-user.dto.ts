import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(150),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
