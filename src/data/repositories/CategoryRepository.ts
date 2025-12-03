import type { Database, SqlValue } from 'sql.js';
import type { Category } from '../../types';
import { getDatabase, saveDatabase } from '../database';

export class CategoryRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  getAll(): Category[] {
    const results = this.db.exec('SELECT * FROM Category ORDER BY Name ASC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToCategory(row));
  }

  getById(id: number): Category | null {
    const results = this.db.exec('SELECT * FROM Category WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToCategory(results[0].values[0]);
  }

  getByName(name: string): Category | null {
    const results = this.db.exec('SELECT * FROM Category WHERE Name = ?', [name]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToCategory(results[0].values[0]);
  }

  create(category: Omit<Category, 'id'>): Category {
    this.db.run(
      `INSERT INTO Category (Name, Description, Color, Icon) VALUES (?, ?, ?, ?)`,
      [
        category.name,
        category.description,
        category.color,
        category.icon,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, category: Partial<Omit<Category, 'id'>>): Category | null {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (category.name !== undefined) {
      updates.push('Name = ?');
      values.push(category.name);
    }
    if (category.description !== undefined) {
      updates.push('Description = ?');
      values.push(category.description);
    }
    if (category.color !== undefined) {
      updates.push('Color = ?');
      values.push(category.color);
    }
    if (category.icon !== undefined) {
      updates.push('Icon = ?');
      values.push(category.icon);
    }

    if (updates.length === 0) {
      return this.getById(id);
    }

    values.push(id);

    this.db.run(
      `UPDATE Category SET ${updates.join(', ')} WHERE Id = ?`,
      values
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    // Check if any transactions reference this category
    const results = this.db.exec(
      'SELECT COUNT(*) FROM [Transaction] WHERE CategoryId = ?',
      [id]
    );
    const count = results[0]?.values[0]?.[0] as number ?? 0;
    if (count > 0) {
      return false;
    }

    this.db.run('DELETE FROM Category WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  hasTransactionReferences(id: number): boolean {
    const results = this.db.exec(
      'SELECT COUNT(*) FROM [Transaction] WHERE CategoryId = ?',
      [id]
    );
    const count = results[0]?.values[0]?.[0] as number ?? 0;
    return count > 0;
  }

  private mapRowToCategory(row: SqlValue[]): Category {
    return {
      id: row[0] as number,
      name: row[1] as string,
      description: row[2] as string | null,
      color: row[3] as string | null,
      icon: row[4] as string | null,
    };
  }
}
