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
