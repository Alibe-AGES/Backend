import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { decimalSchema } from './update-event.dto';

const createMemorySchema = z
  .object({
    id: z.string(),
    eventId: z.string(),
    picture: z.string()
  })
  .strict();

export class CreateMemoryDto extends createZodDto(createMemorySchema) {}
