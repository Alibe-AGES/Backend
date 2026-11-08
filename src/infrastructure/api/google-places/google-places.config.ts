export const GOOGLE_PLACES_API_KEY = Symbol('GOOGLE_PLACES_API_KEY');

/**
 * The key is optional at startup so the API boots without it (tests, environments without the feed);
 * the service only fails explicitly when a search is requested.
 */
export function getGooglePlacesApiKey(environment: NodeJS.ProcessEnv = process.env): string | null {
  return environment.GOOGLE_PLACES_API_KEY?.trim() || null;
}
