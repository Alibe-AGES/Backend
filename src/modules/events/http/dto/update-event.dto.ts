import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const decimalSchema = z.string().regex(/^-?\d+(\.\d{1,30})?$/);

const updateEventSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    date: z.iso.date().optional(),
    time: z.iso.time({ precision: -1 }).optional(),
    location: z.string().trim().min(1).optional(),
    image: z.string().nullable().optional(),
    budgetStart: decimalSchema.nullable().optional(),
    budgetEnd: decimalSchema.nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one event field must be provided',
  });

export class UpdateEventDto extends createZodDto(updateEventSchema) {}
