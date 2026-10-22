import { openBoothDb, requestPersistentStorage } from '@/services/storage/db';
import { PlaysRepository } from '@/services/storage/playsRepository';

export interface Services {
  repo: PlaysRepository;
}

let services: Services | undefined;

/** Composition root: build and wire services once at boot. */
export async function initServices(): Promise<Services> {
  const db = await openBoothDb();
  void requestPersistentStorage();

  services = { repo: new PlaysRepository(db) };
  return services;
}

export function getServices(): Services {
  if (!services) throw new Error('Services not initialised: call initServices() first');
  return services;
}
