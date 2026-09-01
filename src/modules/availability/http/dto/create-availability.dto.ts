import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const createAvailabilitySchema = z
  .object({
    date: z.iso.date(),
    startTime: z.iso.time({ precision: -1 }).optional(),
    endTime: z.iso.time({ precision: -1 }).optional(),
  })
  .superRefine((input, context) => {
    const hasStartTime = input.startTime !== undefined;
    const hasEndTime = input.endTime !== undefined;

    if (hasStartTime !== hasEndTime) {
      context.addIssue({
        code: 'custom',
        path: hasStartTime ? ['endTime'] : ['startTime'],
        message: 'startTime e endTime devem ser enviados juntos.',
      });
      return;
    }

    if (input.startTime && input.endTime && input.startTime >= input.endTime) {
      context.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'endTime deve ser posterior a startTime.',
      });
    }
  });

export class CreateAvailabilityDto extends createZodDto(createAvailabilitySchema) {}
