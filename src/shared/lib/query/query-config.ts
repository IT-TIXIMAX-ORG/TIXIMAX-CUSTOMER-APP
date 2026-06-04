// Query configuration - reused from web project

export const STALE_TIME = {
  /** Master/reference data that rarely changes */
  masterData: 5 * 60 * 1000, // 5 minutes
  /** User-specific data */
  userData: 2 * 60 * 1000, // 2 minutes
  /** Frequently changing data */
  realtime: 30 * 1000, // 30 seconds
} as const;
