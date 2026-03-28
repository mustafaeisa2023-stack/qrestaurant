// ============================================================
// QRestaurant - Auth Service Unit Tests
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

// ─── Mocks ───────────────────────────────────────────────

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, def?: any) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MS: 900000,
    };
    return config[key] ?? def;
  }),
};

// ─── Tests ───────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    const hashedPassword = bcrypt.hashSync('Test@123', 10);
    const mockUser = {
      id: 'user-id-1',
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    };

    it('should return user on valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.validateUser('admin@test.com', 'Test@123');
      expect(result).toMatchObject({ id: 'user-id-1', email: 'admin@test.com' });
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.validateUser('admin@test.com', 'WrongPassword')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUser('unknown@test.com', 'any')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });
      await expect(service.validateUser('admin@test.com', 'Test@123')).rejects.toThrow(UnauthorizedException);
    });

    it('should normalize email (lowercase + trim)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await service.validateUser('  ADMIN@TEST.COM  ', 'Test@123');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
      });
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens on login', async () => {
      const user = { id: 'u1', email: 'a@b.com', role: 'ADMIN', name: 'Admin' };
      mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');
      mockPrismaService.user.update.mockResolvedValue(user);

      const result = await service.login(user);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user).toMatchObject({ email: 'a@b.com' });
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      await service.logout('user-id-1');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        data: { refreshToken: null },
      });
    });
  });

  describe('changePassword', () => {
    const hashedPassword = bcrypt.hashSync('OldPass@1', 10);
    const mockUser = {
      id: 'u1',
      email: 'a@b.com',
      password: hashedPassword,
    };

    it('should update password on correct current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.changePassword('u1', {
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(result.message).toContain('successfully');
    });

    it('should throw BadRequestException on wrong current password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.changePassword('u1', {
        currentPassword: 'Wrong',
        newPassword: 'NewPass@2',
      })).rejects.toThrow(BadRequestException);
    });
  });
});
