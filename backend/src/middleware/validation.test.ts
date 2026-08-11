import { describe, it, expect } from 'vitest';
import { borrowRequestSchema, approveSchema, extensionSchema } from './validation';

describe('borrowRequestSchema', () => {
  it('accepts valid asset borrow payload', () => {
    const parsed = borrowRequestSchema.parse({
      assetIds: [1, 2],
      purpose: 'ทดสอบ',
    });
    expect(parsed.assetIds).toEqual([1, 2]);
    expect(parsed.inventoryItems).toEqual([]);
  });

  it('rejects empty borrow payload', () => {
    expect(() => borrowRequestSchema.parse({})).not.toThrow();
  });
});

describe('approveSchema', () => {
  it('requires Approved or Rejected action', () => {
    expect(() => approveSchema.parse({ action: 'Maybe' })).toThrow();
    expect(approveSchema.parse({ action: 'Approved' }).action).toBe('Approved');
  });
});

describe('extensionSchema', () => {
  it('requires at least one item and positive extra days', () => {
    expect(() => extensionSchema.parse({ requestId: 1, itemIds: [], extraDays: 3 })).toThrow();
    const parsed = extensionSchema.parse({ requestId: 1, itemIds: [10], extraDays: 5 });
    expect(parsed.extraDays).toBe(5);
  });
});
