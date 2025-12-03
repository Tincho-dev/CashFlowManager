import type { Asset } from '../types';
import { AssetRepository } from '../data/repositories/AssetRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class AssetService {
  private assetRepo: AssetRepository;

  constructor() {
    this.assetRepo = new AssetRepository();
  }

  getAllAssets(): Asset[] {
    return this.assetRepo.getAll();
  }

  getAsset(id: number): Asset | null {
    return this.assetRepo.getById(id);
  }

  getAssetByTicket(ticket: string): Asset | null {
    return this.assetRepo.getByTicket(ticket);
  }

  createAsset(ticket?: string | null, price?: number | null): Asset {
    const asset = this.assetRepo.create({
      ticket: ticket ?? null,
      price: price ?? null,
    });
    
    LoggingService.info(LogCategory.ACCOUNT, 'CREATE_ASSET', {
      assetId: asset.id,
      ticket,
      price,
    });
    
    return asset;
  }

  updateAsset(id: number, updates: Partial<Omit<Asset, 'id'>>): Asset | null {
    const asset = this.assetRepo.update(id, updates);
    
    if (asset) {
      LoggingService.info(LogCategory.ACCOUNT, 'UPDATE_ASSET', {
        assetId: id,
        updates,
      });
    }
    
    return asset;
  }

  deleteAsset(id: number): boolean {
    const success = this.assetRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.ACCOUNT, 'DELETE_ASSET', {
        assetId: id,
      });
    }
    
    return success;
  }
}
