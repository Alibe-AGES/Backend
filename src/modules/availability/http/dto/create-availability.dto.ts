import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const availabilityIntervalSchema = z
  .object({
    startTime: z.iso.time({ precision: -1 }),
    endTime: z.iso.time({ precision: -1 }),
  })
  .superRefine((input, context) => {
    if (input.startTime >= input.endTime) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'endTime deve ser posterior a startTime.',
      });
    }
  });

const createAvailabilitySchema = z.object({
  date: z.iso.date(),
  intervals: z.array(availabilityIntervalSchema).optional().default([]),
});

export class CreateAvailabilityDto extends createZodDto(createAvailabilitySchema) {}
