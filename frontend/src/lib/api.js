import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useApi() {
  const { getToken } = useAuth();

  return useCallback(async (url, options = {}) => {
    const token = await getToken();
    const { headers = {}, ...rest } = options;
    return fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, [getToken]);
}
