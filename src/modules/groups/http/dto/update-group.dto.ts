import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class UpdateGroupDto extends createZodDto(
  z
    .object({
      name: z.string().trim().min(2).max(100).optional(),
      removeProfilePicture: z
        .union([z.boolean(), z.enum(['true', 'false'])])
        .transform((value) => value === true || value === 'true')
        .optional(),
    })
    .strict()
) {}
