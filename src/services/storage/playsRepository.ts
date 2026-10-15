import type { PlayRecord } from '@/domain/play';
import type { BoothDatabase } from './db';

export class PlaysRepository {
  constructor(private readonly db: BoothDatabase) {}

  async add(play: PlayRecord): Promise<void> {
    await this.db.put('plays', play);
  }

  /** Highest scores first; a tie goes to the faster finish, then the earlier play. */
  async topScores(limit: number): Promise<PlayRecord[]> {
    const all = await this.db.getAll('plays');
    return all
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.durationSec - b.durationSec ||
          a.timestamp.localeCompare(b.timestamp),
      )
      .slice(0, limit);
  }

  async pending(limit: number): Promise<PlayRecord[]> {
    const rows = await this.db.getAllFromIndex('plays', 'by-status', 'pending');
    return rows.slice(0, limit);
  }

  async pendingCount(): Promise<number> {
    return this.db.countFromIndex('plays', 'by-status', 'pending');
  }

  /** One short transaction: never await anything unrelated inside (idb would close it). */
  async markSynced(ids: readonly string[]): Promise<void> {
    const tx = this.db.transaction('plays', 'readwrite');
    await Promise.all([
      ...ids.map(async (id) => {
        const row = await tx.store.get(id);
        if (row) await tx.store.put({ ...row, syncStatus: 'synced' });
      }),
      tx.done,
    ]);
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
