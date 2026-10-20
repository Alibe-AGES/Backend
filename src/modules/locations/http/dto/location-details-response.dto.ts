import { OmitType } from '@nestjs/swagger';
import { LocationListItemResponseDto } from './location-list-response.dto';

/** Same data as a feed item, without the distance, which depends on the user's coordinates. */
export class LocationDetailsResponseDto extends OmitType(LocationListItemResponseDto, [
  'distanceMeters',
] as const) {}
