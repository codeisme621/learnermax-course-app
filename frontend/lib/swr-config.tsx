'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * SWRProvider wraps the app with SWR configuration
 * Provides consistent caching and revalidation behavior across all SWR hooks
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Revalidation settings
        revalidateOnFocus: true, // Refetch when tab regains focus
        revalidateOnReconnect: true, // Refetch when network reconnects
        revalidateIfStale: true, // Refetch stale data in background

        // Deduplication
        dedupingInterval: 2000, // Dedupe requests within 2 seconds

        // Error handling
        errorRetryCount: 3, // Retry failed requests 3 times
        errorRetryInterval: 5000, // Wait 5 seconds between retries

        // Global error handler
        onError: (error, key) => {
          console.error(`[SWR] Error for key "${key}":`, error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
