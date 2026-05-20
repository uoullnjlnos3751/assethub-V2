import { prisma } from '../index';
import { authenticateLDAP, checkPasswordExpiry } from './ldap';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export class AuthService {
  static async checkExpiry(username: string, password: string) {
    return checkPasswordExpiry(username, password);
  }

  static async login(username: string, password: string) {
    const ldapInfo = await authenticateLDAP(username, password);
    if (!ldapInfo) {
      throw new AppError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
    }

    let user = await prisma.appUser.findUnique({
      where: { adUsername: username },
    });

    if (!user) {
      user = await prisma.appUser.create({
        data: {
          adUsername: username,
          displayName: ldapInfo.displayName,
          email: ldapInfo.email,
          department: ldapInfo.department,
          role: 'USER',
        },
      });
    } else {
      user = await prisma.appUser.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          displayName: ldapInfo.displayName || user.displayName,
          email: ldapInfo.email || user.email,
          department: ldapInfo.department || user.department,
        },
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
