import type { Database, SqlValue } from 'sql.js';
import type { Asset } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class AssetRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Asset[] {
    const results = this.db.exec('SELECT * FROM Assets ORDER BY Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToAsset(row));
  }

  getById(id: number): Asset | null {
    const results = this.db.exec('SELECT * FROM Assets WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToAsset(results[0].values[0]);
  }

  getByTicket(ticket: string): Asset | null {
    const results = this.db.exec('SELECT * FROM Assets WHERE Ticket = ?', [ticket]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToAsset(results[0].values[0]);
  }

  create(asset: Omit<Asset, 'id'>): Asset {
    this.db.run(
      'INSERT INTO Assets (Ticket, Price) VALUES (?, ?)',
      [asset.ticket, asset.price]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, asset: Partial<Omit<Asset, 'id'>>): Asset | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (asset.ticket !== undefined) {
      updates.push('Ticket = ?');
      values.push(asset.ticket);
    }
    if (asset.price !== undefined) {
      updates.push('Price = ?');
      values.push(asset.price);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    this.db.run(
      `UPDATE Assets SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM Assets WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToAsset(row: SqlValue[]): Asset {
    return {
      id: row[0] as number,
      ticket: row[1] as string | null,
      price: row[2] as number | null,
    };
  }
}
