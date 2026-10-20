import { Injectable } from '@nestjs/common';
import { PlacesProvider } from '../../../shared/places/places-provider';
import {
  CatalogLocationsPageService,
  type CatalogLocationsPage,
  type CatalogSearchInput,
} from './services/catalog-locations-page.service';

export type ListCatalogLocationsInput = CatalogSearchInput;

@Injectable()
export class ListCatalogLocationsUseCase {
  constructor(
    private readonly places: PlacesProvider,
    private readonly catalogPage: CatalogLocationsPageService
  ) {}

  execute(input: ListCatalogLocationsInput): Promise<CatalogLocationsPage> {
    return this.catalogPage.build(input, (area) =>
      this.places.searchNearby({
        ...area,
        includedTypes: input.type ? [input.type] : undefined,
      })
    );
  }
}
