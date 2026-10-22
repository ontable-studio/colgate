import type { PlayRecord } from '@/domain/play';
import type { BoothDatabase } from './db';

export class PlaysRepository {
  constructor(private readonly db: BoothDatabase) {}

  async add(play: PlayRecord): Promise<void> {
    await this.db.put('plays', play);
  }

  async all(): Promise<PlayRecord[]> {
    return this.db.getAll('plays');
  }

  async count(): Promise<number> {
    return this.db.count('plays');
  }

  /** Delete every stored play (admin reset). */
  async clear(): Promise<void> {
    await this.db.clear('plays');
  }
}
