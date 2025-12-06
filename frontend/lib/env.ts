/**
 * Environment variable helpers with validation
 */

/**
 * Get API base URL with validation
 * Throws error if NEXT_PUBLIC_API_URL is not set
 */
export function getApiBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error('NEXT_PUBLIC_API_URL is not set');
    console.error('Set it in .env.local (already exists in the project)');
    throw new Error('Missing required environment variable: NEXT_PUBLIC_API_URL');
  }

  return apiUrl;
}
