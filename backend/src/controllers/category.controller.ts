import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { AppError } from '../middleware/errorHandler';

export class CategoryController {
  static async getActiveCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getActiveCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  static async getAllCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getAllCategories();
      res.json(categories);
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, icon, description, sortOrder } = req.body;
      if (!name || !icon) {
        throw new AppError('กรุณากรอกชื่อและไอคอนหมวดหมู่', 400);
      }

      const category = await CategoryService.createCategory({
        name,
        icon,
        description,
        sortOrder,
      });
      res.status(201).json(category);
    } catch (err) {
      next(err);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new AppError('รหัสหมวดหมู่ไม่ถูกต้อง', 400);
      }
      const { name, icon, description, sortOrder, isActive } = req.body;

      const category = await CategoryService.updateCategory(id, {
        name,
        icon,
        description,
        sortOrder,
        isActive,
      });
      res.json(category);
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        throw new AppError('รหัสหมวดหมู่ไม่ถูกต้อง', 400);
      }

      await CategoryService.deleteCategory(id);
      res.json({ message: 'ลบหมวดหมู่เรียบร้อย' });
    } catch (err) {
      next(err);
    }
  }

  static async createCategoryType(req: Request, res: Response, next: NextFunction) {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        throw new AppError('รหัสหมวดหมู่ไม่ถูกต้อง', 400);
      }
      const { name, description, detailTable, isBorrowable, isAssignable, sortOrder } = req.body;
      if (!name) {
        throw new AppError('กรุณากรอกชื่อประเภท', 400);
      }

      const type = await CategoryService.createCategoryType(categoryId, {
        name,
        description,
        detailTable,
        isBorrowable,
        isAssignable,
        sortOrder,
      });
      res.status(201).json(type);
    } catch (err) {
      next(err);
    }
  }

  static async updateCategoryType(req: Request, res: Response, next: NextFunction) {
    try {
      const typeId = parseInt(req.params.typeId);
      if (isNaN(typeId)) {
        throw new AppError('รหัสประเภทอุปกรณ์ไม่ถูกต้อง', 400);
      }
      const { name, description, detailTable, isBorrowable, isAssignable, sortOrder, isActive } = req.body;

      const type = await CategoryService.updateCategoryType(typeId, {
        name,
        description,
        detailTable,
        isBorrowable,
        isAssignable,
        sortOrder,
        isActive,
      });
      res.json(type);
    } catch (err) {
      next(err);
    }
  }

  static async deleteCategoryType(req: Request, res: Response, next: NextFunction) {
    try {
      const typeId = parseInt(req.params.typeId);
      if (isNaN(typeId)) {
        throw new AppError('รหัสประเภทอุปกรณ์ไม่ถูกต้อง', 400);
      }

      await CategoryService.deleteCategoryType(typeId);
      res.json({ message: 'ลบประเภทเรียบร้อย' });
    } catch (err) {
      next(err);
    }
  }

  static async reorderCategoryTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const { typeIds } = req.body;
      if (!Array.isArray(typeIds)) {
        throw new AppError('กรุณาส่ง array ของ typeIds', 400);
      }

      await CategoryService.reorderCategoryTypes(typeIds);
      res.json({ message: 'เรียงลำดับเรียบร้อย' });
    } catch (err) {
      next(err);
    }
  }
}
