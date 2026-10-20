/** Location stored in the database: created manually or by a proposal using a Google place. */
export interface StoredLocation {
  id: string;
  externalId: string | null;
  description: string | null;
  address: string | null;
  manuallyCreated: boolean | null;
}

export abstract class LocationRepository {
  abstract findById(id: string): Promise<StoredLocation | null>;
}
