import { env } from '../config/env';

export class HttpError extends Error {
  constructor(public status: number, public body: any, message?: string) {
    super(message || `HTTP ${status}`);
  }
}

export async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(new URL(path, env.STRAPI_URL), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.STRAPI_BOT_API_TOKEN}`,
      ...(init?.headers || {}),
    },
  });
  let data: any = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new HttpError(res.status, data);
  return data as T;
}

