export interface CatalogLocationData {
  externalId: string;
  description: string | null;
  address: string | null;
}

export abstract class LocationRepository {
  /**
   * Garante que cada local externo exista no catálogo (manually_created = false)
   * e retorna o id interno indexado pelo externalId.
   */
  abstract ensureCatalogLocations(locations: CatalogLocationData[]): Promise<Map<string, string>>;
}
