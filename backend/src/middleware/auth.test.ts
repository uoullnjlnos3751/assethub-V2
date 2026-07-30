import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from './auth';
import { AppError } from './errorHandler';

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers } as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('authenticate middleware', () => {
  it('calls next with 401 when token is missing', () => {
    const next = vi.fn();
    authenticate(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(401);
  });

  it('calls next with 401 when token is invalid', () => {
    const next = vi.fn();
    authenticate(mockReq({ authorization: 'Bearer invalid-token' }), mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(401);
  });
});

describe('authorize middleware', () => {
  it('calls next with 403 when role is not allowed', () => {
    const next = vi.fn();
    const req = mockReq();
    req.user = {
      userId: 1,
      adUsername: 'user',
      role: 'USER',
      displayName: 'User',
      email: null,
      department: null,
    };
    authorize('IT_ADMIN', 'SUPERADMIN')(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0] as AppError;
    expect(err.status).toBe(403);
  });

  it('allows matching role', () => {
    const next = vi.fn();
    const req = mockReq();
    req.user = {
      userId: 1,
      adUsername: 'admin',
      role: 'IT_ADMIN',
      displayName: 'Admin',
      email: null,
      department: null,
    };
    authorize('IT_ADMIN', 'SUPERADMIN')(req, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });
});
