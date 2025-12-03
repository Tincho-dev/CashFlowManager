import type { Database, SqlValue } from 'sql.js';
import type { Owner } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class OwnerRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Owner[] {
    const results = this.db.exec('SELECT * FROM Owner ORDER BY Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToOwner(row));
  }

  getById(id: number): Owner | null {
    const results = this.db.exec('SELECT * FROM Owner WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToOwner(results[0].values[0]);
  }

  create(owner: Omit<Owner, 'id'>): Owner {
    this.db.run(
      'INSERT INTO Owner (Name, Description) VALUES (?, ?)',
      [owner.name, owner.description]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, owner: Partial<Omit<Owner, 'id'>>): Owner | null {
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (owner.name !== undefined) {
      updates.push('Name = ?');
      values.push(owner.name);
    }
    if (owner.description !== undefined) {
      updates.push('Description = ?');
      values.push(owner.description);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id.toString());

    this.db.run(
      `UPDATE Owner SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM Owner WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToOwner(row: SqlValue[]): Owner {
    return {
      id: row[0] as number,
      name: row[1] as string,
      description: row[2] as string | null,
    };
  }
}
