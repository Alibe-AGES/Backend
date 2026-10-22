import { Injectable } from '@nestjs/common';
import { PlacesProvider } from '../../../shared/places/places-provider';
import {
  CatalogLocationsPageService,
  type CatalogLocationsPage,
  type CatalogSearchInput,
} from './services/catalog-locations-page.service';

export interface SearchCatalogLocationsInput extends CatalogSearchInput {
  text: string;
}

@Injectable()
export class SearchCatalogLocationsUseCase {
  constructor(
    private readonly places: PlacesProvider,
    private readonly catalogPage: CatalogLocationsPageService
  ) {}

  execute(input: SearchCatalogLocationsInput): Promise<CatalogLocationsPage> {
    return this.catalogPage.build(input, (area) =>
      this.places.searchText({
        ...area,
        textQuery: input.text,
        includedType:
          typeof input.type === 'string'
            ? input.type
            : input.type?.length === 1
              ? input.type[0]
              : undefined,
      })
    );
  }
}
