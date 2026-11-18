import { hc } from 'hono/client';

import type { AppType } from '../../api/index';

let secretKey = '';

export const setSecretKey = (value: string): void => {
  secretKey = value;
};

export const authorizationHeader = (): string | undefined => (
  secretKey ? `Bearer ${secretKey}` : undefined
);

export const apiClient = hc<AppType>('/', {
  headers: (): Record<string, string> => {
    const authorization = authorizationHeader();
    return authorization ? { Authorization: authorization } : {};
  },
});

interface ErrorResponse {
  clone(): { json(): Promise<unknown> };
}

export const responseError = async (response: ErrorResponse, fallback: string): Promise<string> => {
  try {
    const data = await response.clone().json() as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
};

export const xhrErrorMessage = (xhr: XMLHttpRequest, fallback: string): string => {
  try {
    const data = JSON.parse(xhr.responseText) as { error?: unknown };
    if (typeof data.error === 'string') return data.error;
  } catch {
    // The fallback includes the status when the response is not JSON.
  }
  return fallback;
};
