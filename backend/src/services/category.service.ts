import { prisma } from '../index';

export class CategoryService {
  static async getActiveCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      include: {
        types: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  static async getAllCategories() {
    return prisma.category.findMany({
      include: {
        types: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  static async createCategory(data: {
    name: string;
    icon: string;
    description?: string;
    sortOrder?: number;
  }) {
    return prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon,
        description: data.description,
        sortOrder: data.sortOrder || 0,
      },
      include: { types: true },
    });
  }

  static async updateCategory(
    id: number,
    data: {
      name?: string;
      icon?: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    return prisma.category.update({
      where: { id },
      data,
      include: { types: true },
    });
  }

  static async deleteCategory(id: number) {
    return prisma.category.delete({
      where: { id },
    });
  }

  static async createCategoryType(
    categoryId: number,
    data: {
      name: string;
      description?: string;
      detailTable?: string;
      isBorrowable?: boolean;
      isAssignable?: boolean;
      sortOrder?: number;
    }
  ) {
    return prisma.categoryType.create({
      data: {
        categoryId,
        name: data.name,
        description: data.description,
        detailTable: data.detailTable,
        isBorrowable: data.isBorrowable !== undefined ? data.isBorrowable : true,
        isAssignable: data.isAssignable !== undefined ? data.isAssignable : true,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  static async updateCategoryType(
    typeId: number,
    data: {
      name?: string;
      description?: string;
      detailTable?: string;
      isBorrowable?: boolean;
      isAssignable?: boolean;
      sortOrder?: number;
      isActive?: boolean;
    }
  ) {
    return prisma.categoryType.update({
      where: { id: typeId },
      data,
    });
  }

  static async deleteCategoryType(typeId: number) {
    return prisma.categoryType.delete({
      where: { id: typeId },
    });
  }

  static async reorderCategoryTypes(typeIds: number[]) {
    return prisma.$transaction(
      typeIds.map((id, index) =>
        prisma.categoryType.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
  }
}
