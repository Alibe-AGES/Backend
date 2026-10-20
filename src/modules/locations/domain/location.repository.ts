export interface CatalogLocationData {
  externalId: string;
  description: string | null;
  address: string | null;
}

export interface LocationDetails {
  id: string;
  externalId: string | null;
  description: string | null;
  address: string | null;
  manuallyCreated: boolean | null;
}

export abstract class LocationRepository {
  abstract findById(id: string): Promise<LocationDetails | null>;

  /**
   * Ensures each external place exists in the catalog (manually_created = false)
   * and returns the internal id keyed by externalId.
   */
  abstract ensureCatalogLocations(locations: CatalogLocationData[]): Promise<Map<string, string>>;
}
