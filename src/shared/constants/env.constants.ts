// Environment configuration for mobile app
// TODO: Replace with actual API URL before deployment

export const ENV_CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.tiximax.com',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
} as const;
