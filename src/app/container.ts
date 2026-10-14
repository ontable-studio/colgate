import { env } from '@/config/env';
import { openBoothDb, requestPersistentStorage } from '@/services/storage/db';
import { PlaysRepository } from '@/services/storage/playsRepository';
import { createSheetsClient } from '@/services/sync/sheetsClient';
import { SyncService } from '@/services/sync/syncService';

export interface Services {
  repo: PlaysRepository;
  /** null when no sync endpoint is configured (local-only mode). */
  sync: SyncService | null;
}

let services: Services | undefined;

/** Composition root: build and wire services once at boot. */
export async function initServices(): Promise<Services> {
  const db = await openBoothDb();
  void requestPersistentStorage();

  const repo = new PlaysRepository(db);
  const sync = env.syncEndpoint
    ? new SyncService({
        repo,
        send: createSheetsClient({ endpoint: env.syncEndpoint, secret: env.syncSecret }),
      })
    : null;
  sync?.start();

  services = { repo, sync };
  return services;
}

export function getServices(): Services {
  if (!services) throw new Error('Services not initialised: call initServices() first');
  return services;
}
