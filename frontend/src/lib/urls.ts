/**
 * Where the browser finds the API.
 *
 * Static build (cPanel): set NEXT_PUBLIC_API_URL=https://api.yourdomain.com at BUILD time. It is baked into the JS.
 * Local dev / same-origin: leave it empty; /api and /uploads are then proxied by `next dev` (see next.config.ts).
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

/** Cross-origin API needs cookies sent explicitly; same-origin does not. */
export const FETCH_CREDENTIALS: RequestCredentials = API_BASE ? 'include' : 'same-origin';

/** apiUrl('/quotations/5') -> https://api.example.com/api/quotations/5 */
export const apiUrl = (path: string) => `${API_BASE}/api${path}`;

/** uploadUrl('logos/abc.png') -> https://api.example.com/uploads/logos/abc.png */
export const uploadUrl = (file: string) => `${API_BASE}/uploads/${file}`;

/**
 * Static export cannot have /quotations/[id] (ids are unknown at build time), so the id travels in the query string.
 */
export const quotationHref = (id: number | string) => `/quotations/view?id=${id}`;
export const quotationEditHref = (id: number | string) => `/quotations/edit?id=${id}`;
