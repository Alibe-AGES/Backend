import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Rejeita date repetido (array) ou ausente; o formato YYYY-MM-DD é validado no use case.
const getAvailabilitiesQuerySchema = z.object({
  date: z.string(),
});

export class GetAvailabilitiesQueryDto extends createZodDto(getAvailabilitiesQuerySchema) {}
