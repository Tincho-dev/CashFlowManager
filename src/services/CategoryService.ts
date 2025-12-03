import type { Category } from '../types';
import { CategoryRepository } from '../data/repositories/CategoryRepository';
import LoggingService, { LogCategory } from './LoggingService';

export class CategoryService {
  private categoryRepo: CategoryRepository;

  constructor() {
    this.categoryRepo = new CategoryRepository();
  }

  getAllCategories(): Category[] {
    return this.categoryRepo.getAll();
  }

  getCategory(id: number): Category | null {
    return this.categoryRepo.getById(id);
  }

  getCategoryByName(name: string): Category | null {
    return this.categoryRepo.getByName(name);
  }

  createCategory(
    name: string,
    description?: string | null,
    color?: string | null,
    icon?: string | null
  ): Category | null {
    // Validate that category name is not empty
    if (!name || name.trim() === '') {
      console.error('Category name cannot be empty');
      return null;
    }

    // Check if category with same name already exists
    const existingCategory = this.categoryRepo.getByName(name.trim());
    if (existingCategory) {
      console.error('Category with this name already exists');
      return null;
    }

    const category = this.categoryRepo.create({
      name: name.trim(),
      description: description ?? null,
      color: color ?? null,
      icon: icon ?? null,
    });

    LoggingService.info(LogCategory.TRANSACTION, 'CREATE_CATEGORY', {
      categoryId: category.id,
      name: category.name,
    });

    return category;
  }

  updateCategory(id: number, updates: Partial<Omit<Category, 'id'>>): Category | null {
    const oldCategory = this.categoryRepo.getById(id);
    if (!oldCategory) return null;

    // Validate name if being updated
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim() === '') {
        console.error('Category name cannot be empty');
        return null;
      }
      
      const existingCategory = this.categoryRepo.getByName(updates.name.trim());
      if (existingCategory && existingCategory.id !== id) {
        console.error('Category with this name already exists');
        return null;
      }
      
      updates.name = updates.name.trim();
    }

    const updated = this.categoryRepo.update(id, updates);
    if (!updated) return null;

    LoggingService.info(LogCategory.TRANSACTION, 'UPDATE_CATEGORY', {
      categoryId: id,
      oldName: oldCategory.name,
      newName: updated.name,
      updates,
    });

    return updated;
  }

  deleteCategory(id: number): boolean {
    const category = this.categoryRepo.getById(id);
    if (!category) return false;

    // Check if any transactions are using this category
    if (this.categoryRepo.hasTransactionReferences(id)) {
      console.error('Cannot delete category: transactions are using this category');
      return false;
    }

    const success = this.categoryRepo.delete(id);
    
    if (success) {
      LoggingService.info(LogCategory.TRANSACTION, 'DELETE_CATEGORY', {
        categoryId: id,
        name: category.name,
      });
    }

    return success;
  }

  hasTransactionReferences(id: number): boolean {
    return this.categoryRepo.hasTransactionReferences(id);
  }
}
