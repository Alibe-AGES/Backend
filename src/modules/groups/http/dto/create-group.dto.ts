import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

export class CreateGroupDto extends createZodDto(createGroupSchema) {}
