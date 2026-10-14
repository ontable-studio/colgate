import type { PlayRecord } from '@/domain/play';

export interface SheetsClientOptions {
  endpoint: string;
  secret: string;
  fetchImpl?: typeof fetch;
}

export type SendBatch = (plays: readonly PlayRecord[]) => Promise<string[]>;

/**
 * POSTs plays to the Google Apps Script web app and returns the ids the server accepted
 * (duplicates count as accepted, so retries are safe).
 * Sent as text/plain to stay a "simple" CORS request (no preflight, which Apps Script cannot answer).
 */
export function createSheetsClient({
  endpoint,
  secret,
  fetchImpl = fetch,
}: SheetsClientOptions): SendBatch {
  return async (plays) => {
    // syncStatus is local-only; do not send it.
    const rows = plays.map(({ syncStatus: _omit, ...row }) => row);
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, plays: rows }),
    });
    if (!res.ok) throw new Error(`Sync failed: HTTP ${res.status}`);
    const body = (await res.json()) as { ok?: boolean; accepted?: string[] };
    if (!body.ok || !Array.isArray(body.accepted)) throw new Error('Sync failed: bad response');
    return body.accepted;
  };
}
