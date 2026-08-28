import { createZodDto } from 'nestjs-zod';

import { CreateUserSchema } from './create-user.dto';

export const UpdateUserSchema = CreateUserSchema.partial().refine(
  (data) => data.name !== undefined || data.age !== undefined,
  {
    message: 'At least one field must be provided',
  }
);

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
