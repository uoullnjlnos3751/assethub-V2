import type { z } from 'zod';
import type {
  loginSchema, borrowRequestSchema, approveSchema,
  checkoutSchema, returnSchema, extensionSchema, reminderSchema,
} from '../middleware/validation';

export type LoginInput = z.infer<typeof loginSchema>;
export type BorrowRequestInput = z.infer<typeof borrowRequestSchema>;
export type ApproveInput = z.infer<typeof approveSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
export type ExtensionInput = z.infer<typeof extensionSchema>;
export type ReminderInput = z.infer<typeof reminderSchema>;

export interface PaginationQuery {
  page?: string;
  limit?: string;
  status?: string;
}

export interface AssetQueryParams extends PaginationQuery {
  search?: string;
  typeGroup?: string;
  categoryId?: string;
  locationId?: string;
  status?: string;
  company?: string;
  department?: string;
}

export interface ApiResponse<T = any> {
  data: T;
  total?: number;
  page?: number;
  totalPages?: number;
  message?: string;
}

export interface BorrowRequestItemPayload {
  assetCode: string;
  serialNo: string;
  brand: string;
  model: string;
  category: string;
  name?: string;
  quantity?: number;
  unit?: string;
  status: string;
}

export interface NotificationPayload {
  requestNo: string;
  requester: string;
  department: string;
  purpose?: string;
  location?: string;
  note?: string;
  notes?: string;
  borrowDate: string;
  dueDate: string;
  borrowDays?: string;
  itemsCount: string;
  itemsTable?: string;
  items?: BorrowRequestItemPayload[];
  handoverNote?: string;
  oldDueDate?: string;
  newDueDate?: string;
  extraDays?: string;
  reason?: string;
  assetCode?: string;
  serialNo?: string;
  brand?: string;
  model?: string;
  condition?: string;
  damageNote?: string;
  accessoriesNote?: string;
  returnDate?: string;
  daysOverdue?: string;
  email?: string;
}
