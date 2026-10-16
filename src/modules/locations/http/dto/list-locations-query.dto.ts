import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { DAY_PERIODS, GROUP_SIZES, PLACE_ENVIRONMENTS } from '../../domain/place-filters';

const listLocationsQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  maxDistanceKm: z.coerce.number().positive().max(50).optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  period: z.enum(DAY_PERIODS).optional(),
  environment: z.enum(PLACE_ENVIRONMENTS).optional(),
  groupSize: z.enum(GROUP_SIZES).optional(),
  type: z
    .string()
    .regex(/^[a-z_]+$/)
    .optional(),
});

export class ListLocationsQueryDto extends createZodDto(listLocationsQuerySchema) {}
