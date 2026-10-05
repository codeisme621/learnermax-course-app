/** Only same-site relative paths; anything else falls back. Prevents open redirects via ?callbackUrl. */
export function safeCallbackUrl(value: string | string[] | undefined, fallback = '/dashboard'): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\')) {
    return fallback;
  }
  return v;
}
