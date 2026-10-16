import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const getGroupCalendarQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1000).max(9999),
});

export class GetGroupCalendarQueryDto extends createZodDto(getGroupCalendarQuerySchema) {}
