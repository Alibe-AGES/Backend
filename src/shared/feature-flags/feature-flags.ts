export const FEATURE_FLAGS = {
  /** When enabled, the budget (price range) of places is fetched from Google Places. */
  googlePlacesBudget: 'google_places_budget',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export abstract class FeatureFlags {
  /** Unknown flags are treated as disabled. */
  abstract isEnabled(key: FeatureFlagKey): Promise<boolean>;
}
