import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const listGroupNotificationsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(7),
  })
  .strict();

export class ListGroupNotificationsQueryDto extends createZodDto(
  listGroupNotificationsQuerySchema
) {}
