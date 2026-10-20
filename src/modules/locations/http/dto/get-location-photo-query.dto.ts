import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { PLACE_PHOTO_NAME_PATTERN } from '../../../../shared/places/places-provider';

const getLocationPhotoQuerySchema = z.object({
  name: z.string().regex(PLACE_PHOTO_NAME_PATTERN),
  maxWidthPx: z.coerce.number().int().min(1).max(4800).optional(),
});

export class GetLocationPhotoQueryDto extends createZodDto(getLocationPhotoQuerySchema) {}
