import type { Owner } from '../types';
import { OwnerRepository } from '../data/repositories/OwnerRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class OwnerService {
  private ownerRepo: OwnerRepository;

  constructor() {
    this.ownerRepo = new OwnerRepository();
  }

  getAllOwners(): Owner[] {
    return this.ownerRepo.getAll();
  }

  getOwner(id: number): Owner | null {
    return this.ownerRepo.getById(id);
  }

  createOwner(name: string, description?: string | null): Owner {
    const owner = this.ownerRepo.create({
      name,
      description: description ?? null,
    });
    
    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_OWNER', {
      ownerId: owner.id,
      name,
    });
    
    return owner;
  }

  updateOwner(id: number, updates: Partial<Omit<Owner, 'id'>>): Owner | null {
    const owner = this.ownerRepo.update(id, updates);
    
    if (owner) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_OWNER', {
        ownerId: id,
        updates,
      });
    }
    
    return owner;
  }

  deleteOwner(id: number): boolean {
    const success = this.ownerRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_OWNER', {
        ownerId: id,
      });
    }
    
    return success;
  }
}
