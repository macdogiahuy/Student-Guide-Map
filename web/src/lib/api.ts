import type { Envelope } from './types';

const BASE = '/api/v1';

let accessToken: string | null = null;
export const setToken = (t: string | null) => {
  accessToken = t;
};
export const getToken = () => accessToken;

/** Local flag marking "this browser has logged in before". Cleared on logout. */
const SESSION_KEY = 'sgm_session';
export const setSessionFlag = () => {
  try {
    localStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* storage unavailable — refresh will just 401 once */
  }
};
export const clearSessionFlag = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};

export class ApiError extends Error {
  status: number;
  errors: string[];
  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body,
    credentials: 'include',
  });

  let json: Envelope<T>;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    throw new ApiError(res.status, 'Lỗi máy chủ.');
  }
  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.message || 'Có lỗi xảy ra.', json.errors);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form }),
};

/** Attempt silent refresh; returns new access token or null. */
export async function tryRefresh(): Promise<string | null> {
  // No session flag (logged out / never logged in) -> skip the request entirely
  // so logged-out visitors don't get a 401 noise in the console.
  try {
    if (!localStorage.getItem(SESSION_KEY)) return null;
  } catch {
    return null;
  }
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Envelope<{ accessToken: string }>;
    if (!json.success) return null;
    accessToken = json.data.accessToken;
    return accessToken;
  } catch {
    return null;
  }
}
