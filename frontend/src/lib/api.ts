import { apiUrl, FETCH_CREDENTIALS } from './urls';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: string[], public extra?: Record<string, unknown>) {
    super(message);
  }
}

/** The request never got an answer (offline, DNS, CORS block, server or proxy down). Anything else is a different problem. */
export class NetworkError extends Error {
  constructor(public cause?: unknown) { super('Network error'); }
}

const STATUS_CODE: Record<number, string> = {
  400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 408: 'REQUEST_TIMEOUT', 409: 'CONFLICT', 413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY', 429: 'TOO_MANY_REQUESTS', 500: 'INTERNAL_SERVER_ERROR', 502: 'BAD_GATEWAY', 503: 'SERVICE_UNAVAILABLE', 504: 'GATEWAY_TIMEOUT',
};

/**
 * An ApiError from an error response. When the body is not our JSON (an HTML page from the host / proxy / Passenger when the app is down or
 * a request is too big), the code comes from the HTTP status so the user still gets a real, translated message instead of an empty one.
 */
export function toApiError(status: number, statusText: string, data: any): ApiError {
  const { statusCode, code, message, details, ...extra } = data && typeof data === 'object' ? data : ({} as Record<string, unknown>);
  return new ApiError(status, (code as string) ?? STATUS_CODE[status] ?? `HTTP_${status}`, (message as string) ?? statusText ?? '', details as string[] | undefined, extra);
}

/** fetch for the API (cookies included) where a failure to connect is a NetworkError like everywhere else. */
export async function fetchOrNetworkError(url: string): Promise<Response> {
  try {
    return await fetch(url, { credentials: FETCH_CREDENTIALS });
  } catch (e) {
    throw new NetworkError(e);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

export function qs(params?: Params): string {
  if (!params) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(apiUrl(url), {
      method,
      credentials: FETCH_CREDENTIALS,
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (e) {
    throw new NetworkError(e);
  }
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    throw toApiError(res.status, res.statusText, data);
  }
  return data as T;
}

/** Like api.upload but reports progress (0..1) while the file is being sent. */
function uploadWithProgress<T>(url: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(url));
    xhr.withCredentials = FETCH_CREDENTIALS === 'include';
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total); };
    xhr.onerror = () => reject(new NetworkError());
    xhr.onabort = xhr.onerror;
    xhr.onload = () => {
      let data: any = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(1); resolve(data as T); return; }
      reject(toApiError(xhr.status, xhr.statusText, data));
    };
    xhr.send(form);
  });
}

/** A file (CSV, ...) from the API as a Blob; errors are the same ApiError / NetworkError as everywhere else. */
async function download(url: string, params?: Params): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(apiUrl(url + qs(params)), { credentials: FETCH_CREDENTIALS });
  } catch (e) {
    throw new NetworkError(e);
  }
  if (!res.ok) {
    const data: any = await res.json().catch(() => null);
    throw toApiError(res.status, res.statusText, data);
  }
  return res.blob();
}

export const api = {
  get: <T>(url: string, params?: Params) => request<T>('GET', url + qs(params)),
  download,
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  delete: <T>(url: string) => request<T>('DELETE', url),
  upload: <T>(url: string, form: FormData) => request<T>('POST', url, form),
  uploadWithProgress,
};
