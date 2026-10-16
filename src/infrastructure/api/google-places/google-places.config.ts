export const GOOGLE_PLACES_API_KEY = Symbol('GOOGLE_PLACES_API_KEY');

/**
 * A chave é opcional na inicialização para que a API suba sem ela (testes, ambientes sem feed);
 * o serviço falha de forma explícita somente quando uma busca é solicitada.
 */
export function getGooglePlacesApiKey(environment: NodeJS.ProcessEnv = process.env): string | null {
  return environment.GOOGLE_PLACES_API_KEY?.trim() || null;
}
