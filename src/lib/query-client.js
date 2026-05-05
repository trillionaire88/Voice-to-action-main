import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 3 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false,
    },
  },
});