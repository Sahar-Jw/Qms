import { trackRequest } from './activity';

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
    res = await fetch(`/api${url}`, {
      method,
      credentials: 'same-origin',
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

export const api = {
  get: <T>(url: string, params?: Params) => request<T>('GET', url + qs(params)),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}),
  upload: <T>(url: string, form: FormData) => request<T>('POST', url, form),
};
