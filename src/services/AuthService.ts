import type { User, StoredUser, LocalCredentials, RegisterCredentials, AuthMode } from '../types/auth';
import { AuthMode as AuthModeEnum } from '../types/auth';
import { UserRepository } from '../data/repositories/UserRepository';
import { initDatabase } from '../data/database';
import DataAccessLayer from '../data/DataAccessLayer';

/**
 * AuthService - Handles user authentication and registration
 * 
 * Uses simple hash for password storage. In production, this should use
 * a proper bcrypt or argon2 implementation on the backend.
 */
export class AuthService {
  private userRepository: UserRepository | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Ensure database is initialized before any operation
   */
  private async ensureInitialized(): Promise<UserRepository> {
    if (this.userRepository && DataAccessLayer.isReady()) {
      return this.userRepository;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.userRepository!;
    }

    this.initPromise = this.initialize();
    await this.initPromise;
    return this.userRepository!;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize database if not already done
      await initDatabase();
      await DataAccessLayer.initialize();
      this.userRepository = new UserRepository();
    } catch (error) {
      console.error('[AuthService] Initialization failed:', error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Simple hash function for password storage.
   * NOTE: This is NOT cryptographically secure and is only for demo purposes.
   * In production, use bcrypt or argon2 on the backend.
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'cashflow_salt_v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify password against stored hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const inputHash = await this.hashPassword(password);
    return inputHash === hash;
  }

  /**
   * Register a new local user
   */
  async register(credentials: RegisterCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    const userRepository = await this.ensureInitialized();
    
    // Check if email already exists
    const existingUser = userRepository.getByEmail(credentials.email);
    if (existingUser) {
      return { success: false, error: 'auth.errors.emailExists' };
    }

    // Validate password strength
    if (credentials.password.length < 6) {
      return { success: false, error: 'auth.errors.passwordTooShort' };
    }

    // Hash password and create user
    const passwordHash = await this.hashPassword(credentials.password);
    
    const storedUser = userRepository.create({
      email: credentials.email,
      passwordHash,
      displayName: credentials.displayName,
      authMode: AuthModeEnum.LOCAL,
    });

    const user = this.mapStoredUserToUser(storedUser);
    return { success: true, user };
  }

  /**
   * Login with email and password
   */
  async login(credentials: LocalCredentials): Promise<{ success: boolean; user?: User; error?: string }> {
    const userRepository = await this.ensureInitialized();
    
    const storedUser = userRepository.getByEmail(credentials.email);
    
    if (!storedUser) {
      return { success: false, error: 'auth.errors.invalidCredentials' };
    }

    const isValid = await this.verifyPassword(credentials.password, storedUser.passwordHash);
    
    if (!isValid) {
      return { success: false, error: 'auth.errors.invalidCredentials' };
    }

    const user = this.mapStoredUserToUser(storedUser);
    return { success: true, user };
  }

  /**
   * Login or register with Google
   */
  async loginWithGoogle(credential: string): Promise<{ success: boolean; user?: User; error?: string }> {
    const userRepository = await this.ensureInitialized();
    
    try {
      // Decode the JWT token
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      const googleId = payload.sub;
      const email = payload.email;
      const displayName = payload.name || email.split('@')[0];
      const photoUrl = payload.picture;

      // Check if user exists by Google ID
      let storedUser = userRepository.getByGoogleId(googleId);

      if (!storedUser) {
        // Check if email exists (user might have registered with email first)
        storedUser = userRepository.getByEmail(email);
        
        if (storedUser) {
          // Update existing user with Google info
          storedUser = userRepository.update(storedUser.id, {
            googleId,
            googleToken: credential,
            photoUrl,
          })!;
        } else {
          // Create new user
          storedUser = userRepository.create({
            email,
            passwordHash: '', // No password for Google users
            displayName,
            photoUrl,
            authMode: AuthModeEnum.GOOGLE,
            googleId,
            googleToken: credential,
          });
        }
      } else {
        // Update token
        storedUser = userRepository.update(storedUser.id, {
          googleToken: credential,
          photoUrl,
        })!;
      }

      const user = this.mapStoredUserToUser(storedUser, credential);
      return { success: true, user };
    } catch {
      return { success: false, error: 'auth.errors.googleLoginFailed' };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<StoredUser | null> {
    const userRepository = await this.ensureInitialized();
    return userRepository.getById(id);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const userRepository = await this.ensureInitialized();
    return userRepository.getByEmail(email);
  }

  private mapStoredUserToUser(storedUser: StoredUser, googleToken?: string): User {
    return {
      id: storedUser.id.toString(),
      email: storedUser.email,
      displayName: storedUser.displayName,
      photoUrl: storedUser.photoUrl || undefined,
      authMode: storedUser.authMode as AuthMode,
      googleToken: googleToken || storedUser.googleToken || undefined,
    };
  }
}
