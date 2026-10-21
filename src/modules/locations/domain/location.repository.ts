/** Location stored in the database: created manually or by a proposal using a Google place. */
export interface StoredLocation {
  id: string;
  externalId: string | null;
  name: string | null;
  description: string | null;
  address: string | null;
  openingHours: string[];
  rating: number | null;
  phoneNumber: string | null;
  website: string | null;
  priceRange: { start: string | null; end: string | null; currencyCode: string | null };
  image: string | null;
  manuallyCreated: boolean | null;
}

export interface LocationImageAccess {
  imageKey: string | null;
  userIsMember: boolean;
}

export abstract class LocationRepository {
  abstract findById(id: string): Promise<StoredLocation | null>;
  abstract findImageAccess(id: string, userId: string): Promise<LocationImageAccess | null>;
}
