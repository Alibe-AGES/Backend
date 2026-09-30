import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { decimalSchema } from './update-event.dto';

const createEventSchema = z
  .object({
    name: z.string().optional(),
    date: z.iso.date().optional(),
    time: z.iso.time({ precision: -1 }).optional(),
    location: z.string().optional(),
    budgetStart: decimalSchema.optional(),
    budgetEnd: decimalSchema.optional(),
  })
  .strict();

export class CreateEventDto extends createZodDto(createEventSchema) {}
