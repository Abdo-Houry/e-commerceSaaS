import { isServer, QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          const status = error instanceof AxiosError ? error.response?.status : undefined;
          if (status && status >= 400 && status < 500) return false;
          return count < 2;
        },
      },
    },
  });
}

let browserClient: QueryClient | undefined;

/** One client per browser session, so cached data survives moving between layouts. */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
