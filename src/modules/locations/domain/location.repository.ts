export interface CatalogLocationData {
  externalId: string;
  description: string | null;
  address: string | null;
}

export abstract class LocationRepository {
  /**
   * Ensures each external place exists in the catalog (manually_created = false)
   * and returns the internal id keyed by externalId.
   */
  abstract ensureCatalogLocations(locations: CatalogLocationData[]): Promise<Map<string, string>>;
}
