import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// ── Get all active categories with active types ──
router.get('/', CategoryController.getActiveCategories);

// ── Get all categories (admin, including inactive) ──
router.get('/all', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), CategoryController.getAllCategories);

// ── Create category ──
router.post('/', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), CategoryController.createCategory);

// ── Update category ──
router.put('/:id', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), CategoryController.updateCategory);

// ── Delete category ──
router.delete('/:id', authenticate, authorize('SUPERADMIN'), CategoryController.deleteCategory);

// ── Create type under category ──
router.post('/:id/types', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), CategoryController.createCategoryType);

// ── Update type ──
router.put('/types/:typeId', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), CategoryController.updateCategoryType);

// ── Delete type ──
router.delete('/types/:typeId', authenticate, authorize('SUPERADMIN'), CategoryController.deleteCategoryType);

// ── Reorder types within category ──
router.post('/:id/types/reorder', authenticate, authorize('IT_ADMIN', 'SUPERADMIN'), CategoryController.reorderCategoryTypes);

export default router;
