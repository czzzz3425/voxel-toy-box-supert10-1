async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/';
  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;

  let response: Response;

  try {
    response = await fetch(`${normalizedBase}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');

    if (message.includes('Failed to fetch') || message.includes('ERR_CONNECTION_CLOSED')) {
      throw new Error(
        'The request connection was interrupted. If you are using expert mode, Gemini may be temporarily busy. Please retry in a few seconds.'
      );
    }

    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    let parsed:
      | {
          error?: string;
          message?: string;
          errorCode?: string;
          databaseReport?: {
            health?: { ok?: boolean; mode?: string; message?: string };
            write?: { ok?: boolean; message?: string };
          };
        }
      | null = null;

    try {
      parsed = JSON.parse(errorText) as {
        error?: string;
        message?: string;
        errorCode?: string;
        databaseReport?: {
          health?: { ok?: boolean; mode?: string; message?: string };
          write?: { ok?: boolean; message?: string };
        };
      };
    } catch {
      parsed = null;
    }

    if (!parsed) {
      throw new Error(errorText || 'Request failed.');
    }

    let baseMessage = parsed.error || parsed.message || errorText || 'Request failed.';
    const healthMessage = parsed.databaseReport?.health?.message;
    const writeMessage = parsed.databaseReport?.write?.message;

    if (response.status === 429 || parsed.errorCode === 'RATE_LIMITED') {
      baseMessage =
        'Gemini request quota is temporarily exhausted. Please wait a moment and retry.';
    } else if (response.status === 503 || parsed.errorCode === 'MODEL_UNAVAILABLE') {
      baseMessage =
        'Gemini is temporarily busy, especially for expert mode. Please retry in a few seconds.';
    }

    if (healthMessage || writeMessage) {
      const reportSummary = [healthMessage, writeMessage].filter(Boolean).join(' | ');
      throw new Error(`${baseMessage} [databaseReport: ${reportSummary}]`);
    }

    throw new Error(baseMessage);
  }

  return response.json();
}

export default api;
