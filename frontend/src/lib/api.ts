import { trackRequest } from './activity';
import { apiUrl, FETCH_CREDENTIALS } from './urls';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: string[], public extra?: Record<string, unknown>) {
    super(message);
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
  const done = trackRequest(method);
  let res: Response;
  let text: string;
  try {
    res = await fetch(apiUrl(url), {
      method,
      credentials: FETCH_CREDENTIALS,
      headers: body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    text = await res.text();
  } finally { done(); }
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  if (!res.ok) {
    const { statusCode, code, message, details, ...extra } = data ?? {};
    throw new ApiError(res.status, code ?? `HTTP_${res.status}`, message ?? res.statusText, details, extra);
  }
  return data as T;
}

/** Like api.upload but reports progress (0..1) while the file is being sent. */
function uploadWithProgress<T>(url: string, form: FormData, onProgress: (fraction: number) => void): Promise<T> {
  const done = trackRequest('POST');
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl(url));
    xhr.withCredentials = FETCH_CREDENTIALS === 'include';
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total); };
    xhr.onerror = () => { done(); reject(new TypeError('Network error')); };
    xhr.onabort = xhr.onerror;
    xhr.onload = () => {
      done();
      let data: any = null;
      try { data = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch { /* non-JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(1); resolve(data as T); return; }
      const { statusCode, code, message, details, ...extra } = data ?? {};
      reject(new ApiError(xhr.status, code ?? `HTTP_${xhr.status}`, message ?? xhr.statusText, details, extra));
    };
    xhr.send(form);
  });
}

export const api = {
  get: <T>(url: string, params?: Params) => request<T>('GET', url + qs(params)),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}),
  delete: <T>(url: string) => request<T>('DELETE', url),
  upload: <T>(url: string, form: FormData) => request<T>('POST', url, form),
  uploadWithProgress,
};
