import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { listLocationsQuerySchema } from './list-locations-query.dto';

const searchLocationsQuerySchema = listLocationsQuerySchema.extend({
  q: z.string().trim().min(1).max(200),
});

export class SearchLocationsQueryDto extends createZodDto(searchLocationsQuerySchema) {}
