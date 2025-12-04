import type { Database, SqlValue } from 'sql.js';
import type { StoredUser, AuthMode } from '../../types/auth';
import { saveDatabase } from '../database';
import DataAccessLayer from '../DataAccessLayer';

/**
 * UserRepository - Data access for users
 * Manages user authentication and storage
 */
export class UserRepository {
  private db: Database;

  constructor(db?: Database) {
    if (db) {
      this.db = db;
    } else {
      this.db = DataAccessLayer.getDb();
    }
  }

  getAll(): StoredUser[] {
    const results = this.db.exec('SELECT * FROM User ORDER BY Id DESC');
    if (results.length === 0) return [];

    return results[0].values.map(row => this.mapRowToUser(row));
  }

  getById(id: number): StoredUser | null {
    const results = this.db.exec('SELECT * FROM User WHERE Id = ?', [id]);
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToUser(results[0].values[0]);
  }

  getByEmail(email: string): StoredUser | null {
    const results = this.db.exec(
      'SELECT * FROM User WHERE LOWER(Email) = LOWER(?)',
      [email]
    );
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToUser(results[0].values[0]);
  }

  getByGoogleId(googleId: string): StoredUser | null {
    const results = this.db.exec(
      'SELECT * FROM User WHERE GoogleId = ?',
      [googleId]
    );
    if (results.length === 0 || results[0].values.length === 0) return null;

    return this.mapRowToUser(results[0].values[0]);
  }

  create(user: {
    email: string;
    passwordHash: string;
    displayName: string;
    photoUrl?: string | null;
    authMode: AuthMode;
    googleId?: string | null;
    googleToken?: string | null;
  }): StoredUser {
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO User (Email, PasswordHash, DisplayName, PhotoUrl, AuthMode, GoogleId, GoogleToken, CreatedAt, UpdatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.email,
        user.passwordHash,
        user.displayName,
        user.photoUrl || null,
        user.authMode,
        user.googleId || null,
        user.googleToken || null,
        now,
        now,
      ]
    );

    const results = this.db.exec('SELECT last_insert_rowid()');
    const id = results[0].values[0][0] as number;

    saveDatabase(this.db);
    return this.getById(id)!;
  }

  update(id: number, updates: Partial<{
    email: string;
    passwordHash: string;
    displayName: string;
    photoUrl: string | null;
    googleId: string | null;
    googleToken: string | null;
  }>): StoredUser | null {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    if (updates.email !== undefined) {
      fields.push('Email = ?');
      values.push(updates.email);
    }
    if (updates.passwordHash !== undefined) {
      fields.push('PasswordHash = ?');
      values.push(updates.passwordHash);
    }
    if (updates.displayName !== undefined) {
      fields.push('DisplayName = ?');
      values.push(updates.displayName);
    }
    if (updates.photoUrl !== undefined) {
      fields.push('PhotoUrl = ?');
      values.push(updates.photoUrl);
    }
    if (updates.googleId !== undefined) {
      fields.push('GoogleId = ?');
      values.push(updates.googleId);
    }
    if (updates.googleToken !== undefined) {
      fields.push('GoogleToken = ?');
      values.push(updates.googleToken);
    }

    if (fields.length === 0) {
      return this.getById(id);
    }

    fields.push('UpdatedAt = ?');
    values.push(new Date().toISOString());

    this.db.run(
      `UPDATE User SET ${fields.join(', ')} WHERE Id = ?`,
      [...values, id]
    );

    saveDatabase(this.db);
    return this.getById(id);
  }

  delete(id: number): boolean {
    this.db.run('DELETE FROM User WHERE Id = ?', [id]);
    saveDatabase(this.db);
    return true;
  }

  private mapRowToUser(row: SqlValue[]): StoredUser {
    return {
      id: row[0] as number,
      email: row[1] as string,
      passwordHash: row[2] as string,
      displayName: row[3] as string,
      photoUrl: row[4] as string | null,
      authMode: row[5] as AuthMode,
      googleId: row[6] as string | null,
      googleToken: row[7] as string | null,
      createdAt: row[8] as string,
      updatedAt: row[9] as string,
    };
  }
}
