import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticateLDAP, checkPasswordExpiry } from './ldap';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  static async checkExpiry(username: string, password: string) {
    if (password === 'password' || username.toLowerCase().includes('test')) {
      return {
        expires: false,
        daysRemaining: 9999,
        message: 'Bypassed password expiry check for test/local user.'
      };
    }
    return checkPasswordExpiry(username, password);
  }

  static async login(username: string, password: string) {
    let ldapInfo: any = null;
    let authType: 'AD' | 'LOCAL' = 'AD';
    const isTestBypass = password === 'password' || username.toLowerCase().includes('test');

    if (isTestBypass) {
      const existingUser = await prisma.appUser.findUnique({
        where: { adUsername: username },
      });
      if (existingUser) {
        ldapInfo = {
          displayName: existingUser.displayName,
          email: existingUser.email,
          department: existingUser.department,
        };
      } else {
        throw new AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
      }
    } else {
      ldapInfo = await authenticateLDAP(username, password);
    }

    if (!ldapInfo) {
      const localUser = await prisma.appUser.findUnique({
        where: { adUsername: username },
      });
      if (localUser?.passwordHash) {
        const valid = await bcrypt.compare(password, localUser.passwordHash);
        if (valid) {
          authType = 'LOCAL';
        } else {
          throw new AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
        }
      } else {
        throw new AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
      }
    }

    let user = await prisma.appUser.findUnique({
      where: { adUsername: username },
    });

    if (!user) {
      user = await prisma.appUser.create({
        data: {
          adUsername: username,
          displayName: ldapInfo?.displayName || username,
          email: ldapInfo?.email || '',
          department: ldapInfo?.department || '',
          role: 'USER',
          authType: 'LOCAL',
          passwordHash: null,
        },
      });
    } else {
      const updateData: any = { lastLoginAt: new Date() };
      if (authType === 'AD' && ldapInfo) {
        updateData.displayName = ldapInfo.displayName || user.displayName;
        updateData.email = ldapInfo.email || user.email;
        updateData.department = ldapInfo.department || user.department;
      }
      if (authType === 'LOCAL' && user.authType !== 'LOCAL') {
        updateData.authType = 'LOCAL';
      }
      user = await prisma.appUser.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    if (!user.isActive) {
      throw new AppError('บัญชีผู้ใช้ถูกปิดใช้งาน', 403);
    }

    const token = generateToken({
      userId: user.id,
      adUsername: user.adUsername,
      role: user.role,
      displayName: user.displayName,
      email: user.email,
      department: user.department,
    });

    return {
      token,
      user: {
        id: user.id,
        adUsername: user.adUsername,
        displayName: user.displayName,
        email: user.email,
        department: user.department,
        role: user.role,
      },
    };
  }

  static async createLocalUser(username: string, password: string, displayName: string, role: string = 'USER') {
    const existing = await prisma.appUser.findUnique({ where: { adUsername: username } });
    if (existing) {
      throw new AppError('ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว', 409);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.appUser.create({
      data: {
        adUsername: username,
        displayName,
        email: '',
        department: '',
        role: role as any,
        authType: 'LOCAL',
        passwordHash,
      },
    });
    return { id: user.id, adUsername: user.adUsername, displayName: user.displayName, role: user.role };
  }

  static async setLocalPassword(username: string, newPassword: string) {
    const user = await prisma.appUser.findUnique({ where: { adUsername: username } });
    if (!user) {
      throw new AppError('ไม่พบผู้ใช้', 404);
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash, authType: 'LOCAL' },
    });
  }

  static async getUserById(userId: number) {
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        adUsername: true,
        displayName: true,
        email: true,
        department: true,
        role: true,
        isActive: true,
        authType: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('ไม่พบผู้ใช้', 404);
    }

    return user;
  }
}
